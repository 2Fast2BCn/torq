import Table from "features/table/Table";
import { useGetInvoicesQuery } from "./invoiceApi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Options20Regular as OptionsIcon,
  Check20Regular as InvoiceIcon,
  // Save20Regular as SaveIcon,
} from "@fluentui/react-icons";
import TablePageTemplate, {
  TableControlSection,
  TableControlsButton,
  TableControlsButtonGroup,
} from "features/templates/tablePageTemplate/TablePageTemplate";
import { useState } from "react";
import Button, { buttonColor } from "components/buttons/Button";
import { NEW_INVOICE } from "constants/routes";
import useTranslations from "services/i18n/useTranslations";
import { InvoicesResponse } from "./invoiceTypes";
import {
  AllInvoicesColumns,
  InvoiceFilterTemplate,
  InvoiceSortTemplate,
  DefaultInvoiceView,
  SortableInvoiceColumns,
} from "./invoiceDefaults";
import DefaultCellRenderer from "features/table/DefaultCellRenderer";
import { FilterInterface } from "features/sidebar/sections/filter/filter";
import { usePagination } from "components/table/pagination/usePagination";
import { useGetTableViewsQuery } from "../../viewManagement/viewsApiSlice";
import { useAppSelector } from "../../../store/hooks";
import { selectInvoicesView } from "../../viewManagement/viewSlice";
import ViewsSidebar from "../../viewManagement/ViewsSidebar";

const statusTypes: any = {
  OPEN: "Open",
  SETTLED: "Settled",
  EXPIRED: "Expired",
};

function InvoicesPage() {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const location = useLocation();

  const { isSuccess } = useGetTableViewsQuery<{ isSuccess: boolean }>();
  const viewResponse = useAppSelector(selectInvoicesView);

  const [getPagination, limit, offset] = usePagination("invoices");

  const invoicesResponse = useGetInvoicesQuery<{
    data: InvoicesResponse;
    isLoading: boolean;
    isFetching: boolean;
    isUninitialized: boolean;
    isSuccess: boolean;
  }>(
    {
      limit: limit,
      offset: offset,
      order: viewResponse.view.sortBy,
      filter: viewResponse.view.filters ? (viewResponse.view.filters.toJSON() as FilterInterface) : undefined,
    },
    { skip: !isSuccess }
  );

  // Logic for toggling the sidebar
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // if (invoicesResponse?.data?.data) {
  //   data = invoicesResponse?.data?.data.map((invoice: any) => {
  //     const invoice_state = statusTypes[invoice.invoice_state];
  //
  //     return {
  //       ...invoice,
  //       invoice_state,
  //     };
  //   });
  // }

  const closeSidebarHandler = () => {
    return () => {
      setSidebarExpanded(false);
    };
  };

  const tableControls = (
    <TableControlSection>
      <TableControlsButtonGroup>
        <Button
          buttonColor={buttonColor.green}
          text={t.header.newInvoice}
          className={"collapse-tablet"}
          icon={<InvoiceIcon />}
          onClick={() => {
            navigate(NEW_INVOICE, { state: { background: location } });
          }}
        />
        <TableControlsButton
          onClickHandler={() => setSidebarExpanded(!sidebarExpanded)}
          icon={OptionsIcon}
          id={"tableControlsButton"}
        />
      </TableControlsButtonGroup>
    </TableControlSection>
  );

  const sidebar = (
    <ViewsSidebar
      onExpandToggle={closeSidebarHandler}
      expanded={sidebarExpanded}
      viewResponse={viewResponse}
      allColumns={AllInvoicesColumns}
      defaultView={DefaultInvoiceView}
      filterableColumns={AllInvoicesColumns}
      filterTemplate={InvoiceFilterTemplate}
      sortableColumns={SortableInvoiceColumns}
      sortByTemplate={InvoiceSortTemplate}
    />
  );

  const breadcrumbs = [
    <span key="b1">Transactions</span>,
    <Link key="b2" to={"/transactions/invoices"}>
      Invoices
    </Link>,
  ];

  return (
    <TablePageTemplate
      title={"Invoices"}
      breadcrumbs={breadcrumbs}
      sidebarExpanded={sidebarExpanded}
      sidebar={sidebar}
      tableControls={tableControls}
      pagination={getPagination(invoicesResponse?.data?.pagination?.total || 0)}
    >
      <Table
        cellRenderer={DefaultCellRenderer}
        data={invoicesResponse?.data?.data || []}
        activeColumns={viewResponse.view.columns || []}
        isLoading={invoicesResponse.isLoading || invoicesResponse.isFetching || invoicesResponse.isUninitialized}
      />
    </TablePageTemplate>
  );
}

export default InvoicesPage;
