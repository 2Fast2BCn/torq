package invoices

import (
	"net/http"
	"strconv"

	sq "github.com/Masterminds/squirrel"
	"github.com/cockroachdb/errors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	qp "github.com/lncapital/torq/internal/query_parser"
	ah "github.com/lncapital/torq/pkg/api_helpers"
	"github.com/lncapital/torq/pkg/server_errors"
)

func getInvoicesHandler(c *gin.Context, db *sqlx.DB) {

	// Filter parser with whitelisted columns
	var filter sq.Sqlizer
	filterParam := c.Query("filter")
	var err error
	if filterParam != "" {
		filter, err = qp.ParseFilterParam(filterParam, []string{
			"addIndex",
			"creationDate",
			"settleDate",
			"settleIndex",
			"paymentRequest",
			"destinationPubKey",
			"rHash",
			"rPreimage",
			"memo",
			"value",
			"amtPaid",
			"invoiceState",
			"isRebalance",
			"isKeysend",
			"isAmp",
			"paymentAddr",
			"fallbackAddr",
			"updatedOn",
			"expiry",
			"cltvExpiry",
			"private",
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"Error": err.Error()})
			return
		}
	}

	var sort []string
	sortParam := c.Query("order")
	if sortParam != "" {
		// Order parser with whitelisted columns
		sort, err = qp.ParseOrderParams(
			sortParam,
			[]string{
				"creationDate",
				"settleDate",
				"addIndex",
				"settleIndex",
				"memo",
				"value",
				"amtPaid",
				"invoiceState",
				"isRebalance",
				"isKeysend",
				"isAmp",
				"updatedOn",
				"expiry",
				"private",
			})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"Error": err.Error()})
			return
		}
	}

	var limit uint64
	if c.Query("limit") != "" {
		limit, err = strconv.ParseUint(c.Query("limit"), 10, 64)
		switch err.(type) {
		case nil:
			break
		case *strconv.NumError:
			c.JSON(http.StatusBadRequest, gin.H{"Error": "Limit must be a positive number"})
			return
		default:
			server_errors.LogAndSendServerError(c, err)
		}
		if limit == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"Error": "Limit must be a at least 1"})
			return
		}
	}

	var offset uint64
	if c.Query("offset") != "" {
		offset, err = strconv.ParseUint(c.Query("offset"), 10, 64)
		switch err.(type) {
		case nil:
			break
		case *strconv.NumError:
			c.JSON(http.StatusBadRequest, gin.H{"Error": "Offset must be a positive number"})
			return
		default:
			server_errors.LogAndSendServerError(c, err)
		}
	}

	r, total, err := getInvoices(db, filter, sort, limit, offset)
	if err != nil {
		server_errors.LogAndSendServerError(c, err)
		return
	}

	c.JSON(http.StatusOK, ah.ApiResponse{
		Data: r,
		Pagination: ah.Pagination{
			Total:  total,
			Limit:  limit,
			Offset: offset,
		}})
}

func getInvoiceHandler(c *gin.Context, db *sqlx.DB) {

	r, err := getInvoiceDetails(db, c.Param("identifier"))
	switch err.(type) {
	case nil:
		break
	case ErrInvoiceNotFound:
		c.JSON(http.StatusNotFound, gin.H{"Error": err.Error(), "Identifier": c.Param("identifier")})
		return
	default:
		server_errors.LogAndSendServerError(c, err)
		return
	}

	c.JSON(http.StatusOK, r)
}

func newInvoiceHandler(c *gin.Context, db *sqlx.DB) {

	var requestBody newInvoiceRequest

	if err := c.BindJSON(&requestBody); err != nil {
		server_errors.SendBadRequestFromError(c, errors.Wrap(err, server_errors.JsonParseError))
		return
	}

	resp, err := newInvoice(db, requestBody)
	if err != nil {
		server_errors.WrapLogAndSendServerError(c, err, "Creating new invoice")
		return
	}

	c.JSON(http.StatusOK, resp)
}
