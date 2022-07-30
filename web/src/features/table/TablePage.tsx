import styles from "./table-page.module.scss";
import TableControls from "./controls/TableControls";
import Table from "./tableContent/Table";
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
} from "../tablePage/TablePageTemplate";
import { useState } from "react";

type sections = {
  filter: boolean;
  sort: boolean;
  group: boolean;
  columns: boolean;
};

function TablePage() {
  // initial getting of the table views from the database
  useGetTableViewsQuery();

  // Logic for toggling the sidebar
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // General logic for toggling the sidebar sections
  const initialSectionState: sections = {
    filter: false,
    sort: false,
    columns: false,
    group: false,
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
        <TableControlsButton
          onClickHandler={setSection("group")}
          icon={GroupIcon}
          active={activeSidebarSections.group}
        />
      </TableControlsButtonGroup>
    </TableControlSection>
  );

  const sidebar = (
    <Sidebar title={"Table Options"} closeSidebarHandler={closeSidebarHandler()}>
      <SidebarSection
        title={"Columns"}
        icon={ColumnsIcon}
        expanded={activeSidebarSections.columns}
        sectionToggleHandler={sidebarSectionHandler("columns")}
      >
        {"Something"}
      </SidebarSection>
      <SidebarSection
        title={"Filter"}
        icon={FilterIcon}
        expanded={activeSidebarSections.filter}
        sectionToggleHandler={sidebarSectionHandler("filter")}
      >
        {"Something"}
      </SidebarSection>
      <SidebarSection
        title={"Sort"}
        icon={SortIcon}
        expanded={activeSidebarSections.sort}
        sectionToggleHandler={sidebarSectionHandler("sort")}
      >
        {"Something"}
      </SidebarSection>
      <SidebarSection
        title={"Group"}
        icon={GroupIcon}
        expanded={activeSidebarSections.group}
        sectionToggleHandler={sidebarSectionHandler("group")}
      >
        {"Something"}
      </SidebarSection>
    </Sidebar>
  );

  const breadcrumbs = ["Analyse", <Link to={"/analyse/forwards"}>Forwards</Link>];
  return (
    <TablePageTemplate
      title={"Forwards"}
      breadcrumbs={breadcrumbs}
      sidebarExpanded={sidebarExpanded}
      sidebar={sidebar}
      tableControls={tableControls}
    >
      <Table />
    </TablePageTemplate>
  );
}

export default TablePage;
