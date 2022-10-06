import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ColumnMetaData } from "features/table/Table";
import { SortByOptionType } from "features/sidebar/sections/sort/SortSectionOld";
import { RootState } from "store/store";

export interface ViewInterface {
  title: string;
  id?: number;
  saved: boolean;
  filters?: any;
  columns?: ColumnMetaData[];
  order?: SortByOptionType[];
}

export interface initialStateProps {
  paymentViews: ViewInterface[];
  // newPayments: Map<string, Array<NewPaymentResponse>>;
}

export const AllPaymentsColumns: Array<ColumnMetaData> = [
  { key: "date", heading: "Date", type: "DateCell", valueType: "date" },
  { key: "status", heading: "Status", type: "TextCell", valueType: "array" },
  { key: "value", heading: "Value", type: "NumericCell", valueType: "number" },
  { key: "fee", heading: "Fee", type: "NumericCell", valueType: "number" },
  { key: "ppm", heading: "PPM", type: "NumericCell", valueType: "number" },
  { key: "is_rebalance", heading: "Rebalance", type: "BooleanCell", valueType: "boolean" },
  { key: "seconds_in_flight", heading: "Seconds In Flight", type: "DurationCell", valueType: "duration" },
  { key: "failure_reason", heading: "Failure Reason", type: "TextCell", valueType: "array" },
  { key: "is_mpp", heading: "MPP", type: "BooleanCell", valueType: "boolean" },
  { key: "count_failed_attempts", heading: "Failed Attempts", type: "NumericCell", valueType: "number" },
  { key: "count_successful_attempts", heading: "Successful Attempts", type: "NumericCell", valueType: "number" },
  { key: "destination_pub_key", heading: "Destination", type: "TextCell", valueType: "string" },
  { key: "payment_hash", heading: "Payment Hash", type: "TextCell", valueType: "string" },
  { key: "payment_preimage", heading: "Payment Preimage", type: "TextCell", valueType: "string" },
];

export const ActivePaymentsColumns: Array<ColumnMetaData> = [
  { key: "date", heading: "Date", type: "DateCell", valueType: "date" },
  { key: "status", heading: "Status", type: "TextCell", valueType: "array" },
  { key: "value", heading: "Value", type: "NumericCell", valueType: "number" },
  { key: "fee", heading: "Fee", type: "NumericCell", valueType: "number" },
  { key: "ppm", heading: "PPM", type: "NumericCell", valueType: "number" },
  { key: "is_rebalance", heading: "Rebalance", type: "BooleanCell", valueType: "boolean" },
  { key: "seconds_in_flight", heading: "Seconds In Flight", type: "DurationCell", valueType: "duration" },
  { key: "failure_reason", heading: "Failure Reason", type: "TextCell", valueType: "array" },
  { key: "count_failed_attempts", heading: "Failed Attempts", type: "NumericCell", valueType: "number" },
];

const initialState: initialStateProps = {
  paymentViews: [
    {
      title: "Default View",
      saved: true,
      columns: ActivePaymentsColumns,
    },
  ],
  // newPayments: new Map<string, Array<NewPaymentResponse>>(),
};

export const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {
    updatePaymentsFilters: (state, actions: PayloadAction<{ filters: any }>) => {
      state.paymentViews[0].filters = actions.payload.filters;
    },
    updateColumns: (state, actions: PayloadAction<{ columns: ColumnMetaData[] }>) => {
      state.paymentViews[0].columns = actions.payload.columns;
    },
    // updateNewPaymentResponse: (state, actions: PayloadAction<{ reqId: string; payment: NewPaymentResponse }>) => {
    //   const payment = actions.payload.payment;
    //   const reqId = actions.payload.reqId;
    //   const paymentArray = state.newPayments.get(reqId);
    //   if (paymentArray) {
    //     paymentArray.push(payment);
    //   } else {
    //     state.newPayments.set(reqId, [payment]);
    //   }
    // },
  },
});

export const { updatePaymentsFilters, updateColumns } = paymentsSlice.actions;

export const selectPaymentsFilters = (state: RootState) => {
  return state.payments.paymentViews[0].filters;
};

export const selectActiveColumns = (state: RootState) => {
  return state.payments.paymentViews[0].columns || [];
};

// export const selectNewPayments = (state: RootState) => {
//   return state.payments.paymentViews[0].columns || [];
// };

export const selectAllColumns = (_: RootState) => AllPaymentsColumns;

export default paymentsSlice.reducer;
