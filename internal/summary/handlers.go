package summary

import (
	sq "github.com/Masterminds/squirrel"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	qp "github.com/lncapital/torq/internal/query_parser"
	"github.com/lncapital/torq/pkg/server_errors"
	"net/http"
)

func getPaymentsSummaryHandler(c *gin.Context, db *sqlx.DB) {

	// Filter parser with whitelisted columns
	var filter sq.Sqlizer
	filterParam := c.Query("filter")
	var err error
	if filterParam != "" {
		filter, err = qp.ParseFilterParam(filterParam, []string{
			"date",
			"destination_pub_key",
			"status",
			"value",
			"fee",
			"ppm",
			"failure_reason",
			"is_rebalance",
			"is_mpp",
			"count_successful_attempts",
			"count_failed_attempts",
			"seconds_in_flight",
			"payment_hash",
			"payment_preimage",
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"Error": err.Error()})
			return
		}
	}

	r, err := getPaymentsSummary(db, filter)
	switch err.(type) {
	case nil:
		break
	default:
		server_errors.LogAndSendServerError(c, err)
		return
	}

	c.JSON(http.StatusOK, r)
}

func RegisterSummaryRoutes(r *gin.RouterGroup, db *sqlx.DB) {
	r.GET("payments", func(c *gin.Context) { getPaymentsSummaryHandler(c, db) })
}
