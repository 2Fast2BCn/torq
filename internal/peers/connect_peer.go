package peers

import (
	"context"
	"github.com/cockroachdb/errors"
	"github.com/lightningnetwork/lnd/lnrpc"
	"strings"
)

func ConnectPeer(client lnrpc.LightningClient, ctx context.Context, req ConnectPeerRequest) (r string, err error) {
	connPeerReq, err := processRequest(req)

	if err != nil {
		return "", err
	}

	_, err = client.ConnectPeer(ctx, &connPeerReq)
	if err != nil {
		if strings.Contains(err.Error(), "already connected") {
			return "Peer already connected", nil
		}
		return "", errors.Wrap(err, "Connecting peer")
	}

	return "Peer connected", nil
}

func processRequest(req ConnectPeerRequest) (r lnrpc.ConnectPeerRequest, err error) {
	if req.NodeId == 0 {
		return lnrpc.ConnectPeerRequest{}, errors.Wrap(err, "Processing connect peer request")
	}

	if req.LndAddress.PubKey == "" || req.LndAddress.Host == "" {
		return lnrpc.ConnectPeerRequest{}, errors.Wrap(err, "Missing LND Address or Host")
	}

	addr := lnrpc.LightningAddress{
		Pubkey: req.LndAddress.PubKey,
		Host:   req.LndAddress.Host,
	}

	r.Addr = &addr

	if req.Perm != nil {
		r.Perm = *req.Perm
	}

	if req.TimeOut != nil {
		r.Timeout = *req.TimeOut
	} else {
		r.Timeout = 30
	}

	return r, err
}
