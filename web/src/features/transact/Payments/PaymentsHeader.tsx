import styles from "features/templates/tablePageTemplate/table-page-template.module.scss";
import classNames from "classnames";
import * as d3 from "d3";
import {useGetPaymentsSummaryQuery} from "apiSlice";
import {deserialiseQuery} from "features/sidebar/sections/filter/filter";
import {useAppSelector} from "store/hooks";
import {selectPaymentsFilters} from "features/transact/Payments/paymentsSlice";

const ft = d3.format(",.0f");

function PaymentsHeader() {

  const filters = useAppSelector(selectPaymentsFilters);
  const paymentsSummaryResponse = useGetPaymentsSummaryQuery({
    filter: filters && deserialiseQuery(filters).length >= 1 ? filters : undefined});

  return (
    <div className={classNames(styles.pageRow, styles.tripleRow)}>
      <div className={styles.card}>
        <div className={styles.heading}>Number of Payments</div>
        <div className={styles.cardRow}>
          <div className={styles.rowValue}>{ft(paymentsSummaryResponse?.data?.cnt)}</div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.heading}>Total Sent (Sats)</div>
        <div className={styles.cardRow}>
          <div className={styles.rowValue}>{ft(paymentsSummaryResponse?.data?.total_amt)}</div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.heading}>Total Fee Paid</div>
        <div className={styles.cardRow}>
          <div className={styles.rowValue}>{ft(paymentsSummaryResponse?.data?.total_fees)}</div>
        </div>
      </div>
    </div>
  );
}

export default PaymentsHeader;
