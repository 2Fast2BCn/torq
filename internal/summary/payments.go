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
				count(*) as cnt,
				sum((value_msat/1000))::INTEGER as total_amt,
				sum((fee_msat/1000))::INTEGER as total_fees
			`).
		PlaceholderFormat(sq.Dollar).
		From("payment").
		Where(filter).
		Prefix(`WITH
			tz AS (select preferred_timezone as tz from settings),
			pub_keys as (select array_agg(pub_key) from local_node)
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

	switch err {
	case nil:
		break
	default:
		return nil, err
	}

	return &r, nil
}
