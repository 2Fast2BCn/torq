import styles from "../table/table-page.module.scss";
import TableControls from "../sidebar/sections/TableControls";
import Table from "../table/Table";
import { useGetTableViewsQuery } from "apiSlice";
import { Link } from "react-router-dom";
import {
  Filter20Regular as FilterIcon,
  ArrowSortDownLines20Regular as SortIcon,
  ColumnTriple20Regular as ColumnsIcon,
  ArrowJoin20Regular as GroupIcon,
} from "@fluentui/react-icons";
import Sidebar, { SidebarSection } from "../sidebar/Sidebar";
import TablePageTemplate, {
  TableControlSection,
  TableControlsButton,
  TableControlsButtonGroup,
} from "../templates/tablePageTemplate/TablePageTemplate";
import { useState } from "react";
import TransactTabs from "./TransactTabs";

type sections = {
  filter: boolean;
  sort: boolean;
  columns: boolean;
};

function OnChainPage() {
  // initial getting of the table views from the database
  useGetTableViewsQuery();

  // Logic for toggling the sidebar
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // General logic for toggling the sidebar sections
  const initialSectionState: sections = {
    filter: false,
    sort: false,
    columns: false,
  };
  const [activeSidebarSections, setActiveSidebarSections] = useState(initialSectionState);

  const setSection = (section: keyof sections) => {
    return () => {
      if (activeSidebarSections[section] && sidebarExpanded) {
        setSidebarExpanded(false);
        setActiveSidebarSections(initialSectionState);
      } else {
        setSidebarExpanded(true);
        setActiveSidebarSections({
          ...initialSectionState,
          [section]: true,
        });
      }
    };
  };
  const sidebarSectionHandler = (section: keyof sections) => {
    return () => {
      setActiveSidebarSections({
        ...initialSectionState,
        [section]: !activeSidebarSections[section],
      });
    };
  };

  const closeSidebarHandler = () => {
    return () => {
      setSidebarExpanded(false);
      setActiveSidebarSections(initialSectionState);
    };
  };

  const tableControls = (
    <TableControlSection>
      <TransactTabs />

      <TableControlsButtonGroup>
        <TableControlsButton
          onClickHandler={setSection("columns")}
          icon={ColumnsIcon}
          active={activeSidebarSections.columns}
        />
        <TableControlsButton
          onClickHandler={setSection("filter")}
          icon={FilterIcon}
          active={activeSidebarSections.filter}
        />
        <TableControlsButton onClickHandler={setSection("sort")} icon={SortIcon} active={activeSidebarSections.sort} />
      </TableControlsButtonGroup>
    </TableControlSection>
  );

  const sidebar = (
    <Sidebar title={"Options"} closeSidebarHandler={closeSidebarHandler()}>
      <SidebarSection
        title={"Columns"}
        icon={ColumnsIcon}
        expanded={activeSidebarSections.columns}
        handleToggle={sidebarSectionHandler("columns")}
      >
        {"Something"}
      </SidebarSection>
      <SidebarSection
        title={"Filter"}
        icon={FilterIcon}
        expanded={activeSidebarSections.filter}
        handleToggle={sidebarSectionHandler("filter")}
      >
        {"Something"}
      </SidebarSection>
      <SidebarSection
        title={"Sort"}
        icon={SortIcon}
        expanded={activeSidebarSections.sort}
        handleToggle={sidebarSectionHandler("sort")}
      >
        {"Something"}
      </SidebarSection>
    </Sidebar>
  );

  const breadcrumbs = ["Transactions", <Link to={"/transactions/onchain"}>On-Chain</Link>];
  return (
    <TablePageTemplate
      title={"On-Chain"}
      breadcrumbs={breadcrumbs}
      sidebarExpanded={sidebarExpanded}
      sidebar={sidebar}
      tableControls={tableControls}
    >
      {/*<Table />*/}
    </TablePageTemplate>
  );
}

export default OnChainPage;