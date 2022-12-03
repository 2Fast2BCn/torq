import { useMemo } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import {
  AddSquare20Regular as AddIcon,
  ArrowSortDownLines16Regular as SortDescIcon,
  Delete16Regular as DismissIcon,
  ReOrder16Regular as ReOrderIcon,
} from "@fluentui/react-icons";
import DropDown from "./SortDropDown";
import { ColumnMetaData } from "features/table/types";
import Button, { buttonColor, buttonSize } from "components/buttons/Button";
import styles from "./sort.module.scss";
import classNames from "classnames";
import { useStrictDroppable } from "utils/UseStrictDroppable";
import { useAppDispatch } from "../../../../store/hooks";
import { AllViewsResponse } from "../../../viewManagement/types";
import { addSortBy, updateSortBy, deleteSortBy, updateSortByOrder } from "../../../viewManagement/viewSlice";
import useTranslations from "../../../../services/i18n/useTranslations";

export type OrderBy = {
  key: string;
  direction: "asc" | "desc";
};

type OrderByOption = {
  value: string;
  label: string;
};

type SortRowProps<T> = {
  orderBy: OrderBy;
  options: Array<OrderByOption>;
  page: keyof AllViewsResponse;
  uuid: string;
  index: number;
};

function SortRow<T>(props: SortRowProps<T>) {
  const dispatch = useAppDispatch();
  const handleUpdate = (newValue: any, _: unknown) => {
    const newOrderBy: OrderBy = {
      ...props.orderBy,
      key: newValue.value,
    };
    dispatch(updateSortBy({ page: props.page, uuid: props.uuid, sortByUpdate: newOrderBy, sortByIndex: props.index }));
  };

  const updateDirection = (selected: OrderBy) => {
    const direction = props.orderBy.direction === "asc" ? "desc" : "asc";
    const newOrderBy: OrderBy = {
      ...props.orderBy,
      direction: direction,
    };
    dispatch(updateSortBy({ page: props.page, uuid: props.uuid, sortByUpdate: newOrderBy, sortByIndex: props.index }));
  };

  return (
    <Draggable draggableId={`draggable-sort-id-${props.index}`} index={props.index}>
      {(provided, snapshot) => (
        <div
          className={classNames(styles.sortRow, {
            dragging: snapshot.isDragging,
          })}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div {...provided.dragHandleProps} className={styles.dragHandle}>
            <ReOrderIcon />
          </div>
          <div className={styles.labelWrapper}>
            <DropDown
              onChange={handleUpdate}
              options={props.options}
              getOptionLabel={(option: any): string => option["label"]}
              getOptionValue={(option: any): string => option["value"]}
              value={props.options.find((option) => option.value === props.orderBy.key)}
            />
          </div>

          <div
            className={classNames(styles.directionWrapper, { [styles.asc]: props.orderBy.direction === "asc" })}
            onClick={() => updateDirection(props.orderBy)}
          >
            {<SortDescIcon />}
          </div>
          <div className={styles.dismissIconWrapper}>
            <DismissIcon
              onClick={() => {
                dispatch(deleteSortBy({ page: props.page, uuid: props.uuid, sortByIndex: props.index }));
              }}
            />
          </div>
        </div>
      )}
    </Draggable>
  );
}

type SortSectionProps<T> = {
  page: keyof AllViewsResponse;
  uuid: string;
  columns: Array<ColumnMetaData<T>>;
  sortBy?: Array<OrderBy>;
  defaultSortBy: OrderBy;
};

function SortSection<T>(props: SortSectionProps<T>) {
  const { t } = useTranslations();
  const dispatch = useAppDispatch();

  const [options, _] = useMemo(() => {
    const options: Array<OrderByOption> = [];
    const selected: Array<OrderByOption> = [];

    props.columns.forEach((column) => {
      options.push({
        value: column.key.toString(),
        label: column.heading,
      });
    });
    return [options, selected];
  }, [props.columns]);

  const handleAddSort = () => {
    dispatch(addSortBy({ page: props.page, uuid: props.uuid, sortBy: props.defaultSortBy }));
  };

  const droppableContainerId = "sort-list-droppable";

  const onDragEnd = (result: any) => {
    const { destination, source } = result;

    // Dropped outside of container
    if (!destination || destination.droppableId !== droppableContainerId) {
      return;
    }

    // Position not changed
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Update sort by order
    dispatch(
      updateSortByOrder({
        page: props.page,
        uuid: props.uuid,
        fromIndex: source.index,
        toIndex: destination.index,
      })
    );
  };

  // Workaround for incorrect handling of React.StrictMode by react-beautiful-dnd
  // https://github.com/atlassian/react-beautiful-dnd/issues/2396#issuecomment-1248018320
  const [strictDropEnabled] = useStrictDroppable(!props.sortBy);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles.sortPopoverContent}>
        {!props.sortBy?.length && <div className={styles.noFilters}>Not sorted</div>}

        {strictDropEnabled && (
          <Droppable droppableId={droppableContainerId}>
            {(provided) => (
              <div className={styles.sortRows} ref={provided.innerRef} {...provided.droppableProps}>
                {props.sortBy?.map((item, index) => {
                  return (
                    <SortRow
                      key={item.key + index}
                      orderBy={item}
                      options={options}
                      index={index}
                      uuid={props.uuid}
                      page={props.page}
                    />
                  );
                })}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}

        <div className={styles.buttonsRow}>
          <Button
            buttonColor={buttonColor.ghost}
            buttonSize={buttonSize.small}
            onClick={() => handleAddSort()}
            text={t.Add}
            icon={<AddIcon />}
          />
        </div>
      </div>
    </DragDropContext>
  );
}

export default SortSection;
