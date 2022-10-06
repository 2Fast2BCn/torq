import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ViewInterface, viewOrderInterface } from "features/forwards/forwardsSlice";
import { settings, timeZone, localNode } from "apiTypes";
import { getRestEndpoint, getWsEndpoint } from "utils/apiUrlBuilder";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Clause } from "features/sidebar/sections/filter/filter";
import type {
  GetChannelHistoryQueryParams,
  GetDecodedInvoiceQueryParams,
  GetFlowQueryParams,
  GetForwardsQueryParams,
  GetInvoicesQueryParams,
  GetOnChainTransactionsQueryParams,
  GetPaymentsQueryParams,
} from "types/api";
import { queryParamsBuilder } from "utils/queryParamsBuilder";
import type { localNode, settings, timeZone } from "./apiTypes";

const API_URL = getRestEndpoint();
export const WS_URL = getWsEndpoint();

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  // prepareHeaders: (headers, _) => {
  //   if (!headers.get("Content-Type")) {
  //     headers.set("Content-Type", "application/json");
  //   }
  //   return headers;
  // },
  credentials: "include",
  mode: "cors",
});

const baseQueryWithRedirect: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    window.location.href = "/login";
  }
  return result;
};

// Define a service using a base URL and expected endpoints
export const torqApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRedirect,
  tagTypes: ["settings", "tableView", "localNodes"],
  endpoints: (builder) => ({
    getFlow: builder.query<any, GetFlowQueryParams>({
      query: (params) => queryParamsBuilder("flow", params), //
    }),
    getChannelHistory: builder.query<any, GetChannelHistoryQueryParams>({
      query: (params) => queryParamsBuilder({ endpoint: "channels", baseParam: "chanIds" }, params),
    }),
    getForwards: builder.query<any, GetForwardsQueryParams>({
      query: (params) => queryParamsBuilder("forwards", params, true),
    }),
    getDecodedInvoice: builder.query<any, GetDecodedInvoiceQueryParams>({
      query: (params) => queryParamsBuilder("invoices/decode/", params),
    }),
    getPayments: builder.query<any, GetPaymentsQueryParams>({
      query: (params) => queryParamsBuilder("payments", params, true),
    }),
    getPaymentsSummary: builder.query<
      any,
      { filter?: Clause }
      >({
      query: ({ filter }) => `summary/payments?${filter ? "&filter=" + JSON.stringify(filter) : ""}`,
    }),
    getInvoices: builder.query<any, GetInvoicesQueryParams>({
      query: (params) => queryParamsBuilder("invoices", params, true),
    }),
    getOnChainTx: builder.query<any, GetOnChainTransactionsQueryParams>({
      query: (params) => queryParamsBuilder("on-chain-tx", params, true),
    }),
    getTableViews: builder.query<any, void>({
      query: () => `table-views`,
      providesTags: ["tableView"],
    }),
    createTableView: builder.mutation<any, { view: ViewInterface; index: number }>({
      query: (data) => ({
        url: "table-views",
        method: "POST",
        body: { id: null, view: data.view },
      }),
      transformResponse: (response: { view: ViewInterface }, _, arg) => ({
        view: response,
        index: arg.index,
      }),
    }),
    updateTableView: builder.mutation<any, ViewInterface>({
      query: (view: ViewInterface) => ({
        url: "table-views",
        method: "PUT",
        body: { id: view.id, view: view },
      }),
    }),
    deleteTableView: builder.mutation<any, { view: ViewInterface; index: number }>({
      query: (data) => ({
        url: `table-views/${data.view.id}`,
        method: "DELETE",
      }),
      transformResponse: (_, __, arg) => ({ index: arg.index }),
    }),
    updateTableViewsOrder: builder.mutation<any, viewOrderInterface[]>({
      query: (order: viewOrderInterface[]) => ({
        url: "table-views/order",
        method: "PATCH",
        body: order,
      }),
    }),
    logout: builder.mutation<any, void>({
      query: () => ({
        url: "logout",
        method: "POST",
      }),
      invalidatesTags: ["tableView"],
    }),
    login: builder.mutation<any, FormData>({
      query: (form) => ({
        url: "login",
        method: "POST",
        body: new URLSearchParams(form as any),
        // headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    }),
    getSettings: builder.query<settings, void>({
      query: () => `settings`,
      providesTags: ["settings"],
    }),
    updateSettings: builder.mutation<any, settings>({
      query: (settings) => ({
        url: "settings",
        method: "PUT",
        body: settings,
      }),
      invalidatesTags: ["settings"],
    }),
    getTimeZones: builder.query<timeZone[], void>({
      query: () => `settings/timezones`,
    }),
    getLocalNodes: builder.query<localNode[], void>({
      query: () => `settings/local-nodes`,
      providesTags: ["localNodes"],
    }),
    getLocalNode: builder.query<localNode, number>({
      query: (nodeId) => `settings/local-nodes/${nodeId}`,
      providesTags: ["localNodes"],
    }),
    addLocalNode: builder.mutation<any, FormData>({
      query: (localNode) => ({
        url: "settings/local-nodes",
        method: "POST",
        body: localNode,
      }),
      invalidatesTags: ["localNodes"],
    }),
    updateLocalNode: builder.mutation<any, { form: FormData; localNodeId: number }>({
      query: (localNode) => ({
        url: `settings/local-nodes/${localNode.localNodeId}`,
        method: "PUT",
        body: localNode.form,
      }),
      invalidatesTags: ["localNodes"],
    }),
    updateLocalNodeSetDisabled: builder.mutation<any, { localNodeId: number; disabled: boolean }>({
      query: (localNode) => ({
        url: `settings/local-nodes/${localNode.localNodeId}/set-disabled`,
        method: "PUT",
        body: localNode,
      }),
      invalidatesTags: ["localNodes"],
    }),
    updateLocalNodeSetDeleted: builder.mutation<any, { localNodeId: number }>({
      query: (localNode) => ({
        url: `settings/local-nodes/${localNode.localNodeId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["localNodes"],
    }),
  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
  useGetFlowQuery,
  useGetChannelHistoryQuery,
  useGetForwardsQuery,
  useGetDecodedInvoiceQuery,
  useGetPaymentsQuery,
  useGetPaymentsSummaryQuery,
  useGetInvoicesQuery,
  useGetOnChainTxQuery,
  useGetTableViewsQuery,
  useUpdateTableViewMutation,
  useCreateTableViewMutation,
  useDeleteTableViewMutation,
  useUpdateTableViewsOrderMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetTimeZonesQuery,
  useGetLocalNodeQuery,
  useGetLocalNodesQuery,
  useUpdateLocalNodeMutation,
  useAddLocalNodeMutation,
  useUpdateLocalNodeSetDeletedMutation,
  useUpdateLocalNodeSetDisabledMutation,
} = torqApi;
