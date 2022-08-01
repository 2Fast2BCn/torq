package channels

import (
	"strconv"
	"strings"
	"time"

	"github.com/cockroachdb/errors"
	"github.com/jmoiron/sqlx"
	"gopkg.in/guregu/null.v4"
)

type Channel struct {
	// A database primary key. NOT a channel_id as specified in BOLT 2
	ChannelDBID int `json:"channelDBId" db:"channel_db_id"`
	// In the c-lighting and BOLT format e.g. 505580:1917:1
	ShortChannelID string `json:"shortChannelId" db:"short_channel_id"`
	// At the moment only used by LND. Format is "funding tx id : output id"
	ChannelPoint      null.String `json:"channelPoint" db:"channel_point"`
	Alias             null.String `json:"alias" db:"alias"`
	DestinationPubKey null.String `json:"destinationPubKey" db:"destination_pub_key"`
	LocalNodeId       int         `json:"localNodeId" db:"local_node_id"`
	CreatedOn         time.Time   `json:"createdOn" db:"created_on"`
	UpdateOn          null.Time   `json:"updatedOn" db:"updated_on"`
}

func AddChannelRecordIfDoesntExist(db *sqlx.DB, channel Channel) error {
	dbChannel, err := getChannel(db, channel.ShortChannelID)
	if err != nil {
		return err
	}
	if dbChannel != nil {
		return nil
	}
	err = insertChannel(db, channel)
	if err != nil {
		return err
	}
	return nil
}

func ConvertLNDShortChannelID(LNDShortChannelID uint64) string {
	blockHeight := uint32(LNDShortChannelID >> 40)
	txIndex := uint32(LNDShortChannelID>>16) & 0xFFFFFF
	outputIndex := uint16(LNDShortChannelID)
	return strconv.FormatUint(uint64(blockHeight), 10) +
		"x" + strconv.FormatUint(uint64(txIndex), 10) +
		"x" + strconv.FormatUint(uint64(outputIndex), 10)
}

func ConvertShortChannelIDToLND(ShortChannelID string) (uint64, error) {
	parts := strings.Split(ShortChannelID, "x")
	blockHeight, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, errors.Wrap(err, "Converting block height from string to int")
	}
	txIndex, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, errors.Wrap(err, "Converting tx index from string to int")
	}
	txPosition, err := strconv.Atoi(parts[2])
	if err != nil {
		return 0, errors.Wrap(err, "Converting tx position from string to int")
	}

	return (uint64(blockHeight) << 40) |
		(uint64(txIndex) << 16) |
		(uint64(txPosition)), nil
}
