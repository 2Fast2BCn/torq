package commons

import (
	"context"
	"time"

	"github.com/andres-erbsen/clock"
	"github.com/cockroachdb/errors"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"

	"github.com/lncapital/torq/internal/database"
)

func MaintenanceServiceStart(ctx context.Context, db *sqlx.DB, nodeId int, lightningCommunicationChannel chan interface{}) {
	ticker := clock.New().Tick(MAINTENANCE_QUEUE_TICKER_SECONDS * time.Second)

	nodeSettings := GetNodeSettingsByNodeId(nodeId)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker:
			// TODO get forwards/invoices/payments without firstNodeId/secondNodeId/nodeId and assign correctly
			processMissingChannelData(db, nodeSettings, lightningCommunicationChannel)
		}
	}
}

func processMissingChannelData(db *sqlx.DB, nodeSettings ManagedNodeSettings, lightningCommunicationChannel chan interface{}) {
	if nodeSettings.Chain != Bitcoin || nodeSettings.Network != MainNet {
		log.Info().Msgf("Skipping verification of funding and closing details from vector for nodeId: %v", nodeSettings.NodeId)
		return
	}
	channelSettings := GetChannelSettingsByNodeId(nodeSettings.NodeId)
	for _, channelSetting := range channelSettings {
		if hasMissingClosingDetails(channelSetting) {
			transactionDetails := GetTransactionDetailsFromVector(*channelSetting.ClosingTransactionHash, nodeSettings.NodeId, lightningCommunicationChannel)
			err := updateClosingDetails(db, channelSetting, transactionDetails)
			if err != nil {
				log.Error().Err(err).Msgf("Failed to update closing details from vector for channelId: %v", channelSetting.ChannelId)
			}
			time.Sleep(MAINTENANCE_VECTOR_DELAY_MILLISECONDS * time.Millisecond)
		}
		if hasMissingFundingDetails(channelSetting) {
			transactionDetails := GetTransactionDetailsFromVector(channelSetting.FundingTransactionHash, nodeSettings.NodeId, lightningCommunicationChannel)
			err := updateFundingDetails(db, channelSetting, transactionDetails)
			if err != nil {
				log.Error().Err(err).Msgf("Failed to update funding details from vector for channelId: %v", channelSetting.ChannelId)
			}
			time.Sleep(MAINTENANCE_VECTOR_DELAY_MILLISECONDS * time.Millisecond)
		}
	}
}

func hasMissingClosingDetails(channelSetting ManagedChannelSettings) bool {
	if channelSetting.Status == Opening {
		return false
	}
	if channelSetting.Status == Open {
		return false
	}
	if channelSetting.Status == FundingCancelledClosed {
		return false
	}
	if channelSetting.Status == AbandonedClosed {
		return false
	}
	if channelSetting.FundingTransactionHash != "" {
		if channelSetting.FundingTransactionOn == nil {
			return true
		}
		if channelSetting.FundingBlockHeight == nil || *channelSetting.FundingBlockHeight == 0 {
			return true
		}
		if channelSetting.FundedOn == nil {
			return true
		}
	}
	return false
}

func updateClosingDetails(db *sqlx.DB, channel ManagedChannelSettings, transactionDetails TransactionDetailsHttpResponse) error {
	if transactionDetails.BlockHeight != 0 {
		channel.ClosedOn = &transactionDetails.BlockTimestamp
		channel.ClosingTransactionOn = &transactionDetails.TransactionTimestamp
		channel.ClosingBlockHeight = &transactionDetails.BlockHeight
		_, err := db.Exec(`
		UPDATE channel
		SET closing_block_height=$2, closing_transaction_on=$3, closed_on=$4, updated_on=$5
		WHERE channel_id=$1;`,
			channel.ChannelId, channel.ClosingBlockHeight, channel.ClosingTransactionOn, channel.ClosedOn, time.Now().UTC())
		if err != nil {
			return errors.Wrap(err, database.SqlExecutionError)
		}
		SetChannel(channel.ChannelId, &channel.ShortChannelId, &channel.LndShortChannelId, channel.Status,
			channel.FundingTransactionHash, channel.FundingOutputIndex,
			channel.FundingBlockHeight, channel.FundingTransactionOn, channel.FundedOn,
			channel.Capacity, channel.Private, channel.FirstNodeId, channel.SecondNodeId,
			channel.InitiatingNodeId, channel.AcceptingNodeId,
			channel.ClosingTransactionHash, channel.ClosingNodeId, channel.ClosingBlockHeight, channel.ClosingTransactionOn, channel.ClosedOn)
	}
	return nil
}

func hasMissingFundingDetails(channelSetting ManagedChannelSettings) bool {
	if channelSetting.Status == Opening {
		return false
	}
	if channelSetting.Status == FundingCancelledClosed {
		return false
	}
	if channelSetting.Status == AbandonedClosed {
		return false
	}
	if channelSetting.FundingTransactionHash != "" {
		if channelSetting.FundingTransactionOn == nil {
			return true
		}
		if channelSetting.FundingBlockHeight == nil || *channelSetting.FundingBlockHeight == 0 {
			return true
		}
		if channelSetting.FundedOn == nil {
			return true
		}
	}
	return false
}

func updateFundingDetails(db *sqlx.DB, channel ManagedChannelSettings, transactionDetails TransactionDetailsHttpResponse) error {
	if transactionDetails.BlockHeight != 0 {
		channel.FundedOn = &transactionDetails.BlockTimestamp
		channel.FundingTransactionOn = &transactionDetails.TransactionTimestamp
		channel.FundingBlockHeight = &transactionDetails.BlockHeight
		_, err := db.Exec(`
		UPDATE channel
		SET funding_block_height=$2, funding_transaction_on=$3, funded_on=$4, updated_on=$5
		WHERE channel_id=$1;`,
			channel.ChannelId, channel.FundingBlockHeight, channel.FundingTransactionOn, channel.FundedOn, time.Now().UTC())
		if err != nil {
			return errors.Wrap(err, database.SqlExecutionError)
		}
		SetChannel(channel.ChannelId, &channel.ShortChannelId, &channel.LndShortChannelId, channel.Status,
			channel.FundingTransactionHash, channel.FundingOutputIndex,
			channel.FundingBlockHeight, channel.FundingTransactionOn, channel.FundedOn,
			channel.Capacity, channel.Private, channel.FirstNodeId, channel.SecondNodeId,
			channel.InitiatingNodeId, channel.AcceptingNodeId,
			channel.ClosingTransactionHash, channel.ClosingNodeId, channel.ClosingBlockHeight, channel.ClosingTransactionOn, channel.ClosedOn)
	}
	return nil
}
