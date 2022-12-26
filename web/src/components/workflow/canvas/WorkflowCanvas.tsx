import styles from "./workflow_canvas.module.scss";
import React, { createRef, MutableRefObject, ReactNode, useRef, useState } from "react";
import classNames from "classnames";

type WorkflowCanvasProps = {
  children: ReactNode;
  active: boolean;
};

// Context provider is used to pass these references to the workflow nodes without having to pass them as props
export const CanvasContext = React.createContext<{
  canvasRef: MutableRefObject<HTMLDivElement> | null;
  svgRef: MutableRefObject<SVGSVGElement> | null;
  blankImgRef: MutableRefObject<HTMLCanvasElement> | null;
}>({
  canvasRef: null,
  svgRef: null,
  blankImgRef: null,
});

function WorkflowCanvas(props: WorkflowCanvasProps) {
  // p is used to store the current position of the canvas
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // canvasRef is used to allow workflow nodes to use the canvas position as reference
  const canvasRef = createRef() as MutableRefObject<HTMLDivElement>;

  // svgRef is used to place connecting lines between workflow nodes
  const svgRef = createRef() as MutableRefObject<SVGSVGElement>;

  // blankImgRef is only used to have a blank image as drag image when dragging nodes, hiding the default ugly image.
  const blankImgRef = createRef() as MutableRefObject<HTMLCanvasElement>;

  // wrapperRef is used to refer to the wrapper element that surrounds the canvas
  const wrapperRef = useRef() as MutableRefObject<HTMLDivElement>;

  // canvasPosition is used to store the initial position of the canvas when a drag starts
  const [canvasPosition, setCanvasPositionBB] = useState({ left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    // Set the type of drag-and-drop operation that is allowed for the element being dragged
    e.dataTransfer.effectAllowed = "move";

    // Calculate the x and y coordinates of the mouse cursor relative to the top-left corner of the canvas
    const canvasPosition = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasPosition.left;
    const y = e.clientY - canvasPosition.top;

    // Set the image that is shown as the element is being dragged
    e.dataTransfer.setDragImage(blankImgRef.current, x, y);

    // Set the isDragging and canvasPositionBB state variables
    setIsDragging(true);
    setCanvasPositionBB({ left: x, top: y });
  }

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const bb = wrapperRef.current.getBoundingClientRect();
    if (e.clientX !== 0 && e.clientY !== 0) {
      const newX = e.clientX - bb.x - canvasPosition.left;
      const newY = e.clientY - bb.y - canvasPosition.top;
      setPosition({ x: newX, y: newY });
      // props.onPositionChange(props.stage, { x: newX, y: newY });
    }
  }

  function handleDragEnd(e: React.DragEvent<HTMLDivElement>) {
    setIsDragging(false);
  }

  return (
    <CanvasContext.Provider
      value={{
        canvasRef: canvasRef,
        svgRef: svgRef,
        blankImgRef: blankImgRef,
      }}
    >
      <div className={classNames(styles.workflowWrapper, { [styles.selectedStage]: props.active })} ref={wrapperRef}>
        <div
          className={classNames(styles.workspaceCanvas, { [styles.dragging]: isDragging })}
          onDragOver={(e) => e.preventDefault()}
          style={{ backgroundPosition: `${position.x}px ${position.y}px` }}
        >
          <div
            className={styles.canvasDragSurface}
            draggable="true"
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onDragOver={(e) => e.preventDefault()}
          />
          <div style={{ transform: "translate(" + position.x + "px, " + position.y + "px)" }} ref={canvasRef}>
            {props.children}
          </div>
          <canvas ref={blankImgRef} style={{ width: "1px", height: "1px" }} />
        </div>
      </div>
    </CanvasContext.Provider>
  );
}

export default WorkflowCanvas;
