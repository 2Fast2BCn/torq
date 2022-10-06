package summary

import (
	sq "github.com/Masterminds/squirrel"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

type Payments struct {
	Count     int `json:"cnt" db:"cnt"`
	TotalAmt  int `json:"total_amt" db:"total_amt"`
	TotalFees int `json:"total_fees" db:"total_fees"`
}

func getPaymentsSummary(db *sqlx.DB, filter sq.Sqlizer) (*Payments, error) {

	//language=PostgreSQL
	qb := sq.Select(`
				COALESCE(COUNT(*), 0) AS cnt,
				COALESCE(SUM((value_msat/1000))::INTEGER, 0) AS total_amt,
				COALESCE(SUM((fee_msat/1000))::INTEGER, 0) AS total_fees
			`).
		PlaceholderFormat(sq.Dollar).
		From("payment").
		Where(filter).
		Prefix(`WITH
			tz AS (SELECT preferred_timezone AS tz FROM settings),
			pub_keys AS (SELECT array_agg(pub_key) FROM local_node)
		`)

	qs, args, err := qb.ToSql()
	r := Payments{}

	// Log for debugging
	log.Debug().Msgf("Query: %s, \n Args: %v", qs, args)

	err = db.QueryRow(qs, args...).Scan(
		&r.Count,
		&r.TotalAmt,
		&r.TotalFees,
	)

	if err != nil {
		return nil, err
	}

	return &r, nil
}
