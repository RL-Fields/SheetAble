import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  getAnnotations,
  saveAnnotation,
} from "../../../Redux/Actions/dataActions";

export const ANNOTATION_COLORS = [
  "#e63946",
  "#2a9d8f",
  "#264653",
  "#f4a261",
  "#000000",
];

/*
  Owns all the state and canvas logic for freehand PDF annotation on one
  sheet page: loading/saving strokes, drawing, undo/clear, and sizing the
  canvas to match whatever size the PDF page actually renders at.

  Strokes are stored as points that are FRACTIONS (0..1) of the canvas's
  own width/height, not raw pixels - so a stroke drawn at one display size
  still lines up correctly if the page is later shown at a different size
  (desktop vs. mobile width, window resize, etc.). The canvas element's
  drawing buffer is resized to match containerRef's actual rendered box on
  mount, on window resize, and whenever the strokes list changes size (so
  a fresh page's PDF, once rendered, gets picked up).

  Saving is explicit (matches the product decision: a Save button, not
  autosave) - draw freely, undo/clear as needed, then Save writes the
  complete current stroke list for this page. Annotations are shared, not
  per-user: everyone viewing this sheet sees and can edit the same marks.

  A third "tool", text, doesn't drag like pen/highlighter - a single click
  prompts for text (via window.prompt, matching the plain-dialog pattern
  already used for Clear's confirmation) and drops it at that point.
*/
export function useSheetAnnotation(sheetName, pageNumber) {
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  // A callback ref (rather than a plain useRef) so we find out the exact
  // moment the wrapper div actually mounts - react-pdf renders the PDF
  // page asynchronously, so this can happen well after this hook's first
  // render, and a plain ref gives no signal for "the node just appeared."
  const [containerNode, setContainerNode] = useState(null);
  const containerRef = useCallback((node) => setContainerNode(node), []);

  const [strokes, setStrokes] = useState([]);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(ANNOTATION_COLORS[0]);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // (Re)load this page's saved strokes whenever the sheet or page changes.
  useEffect(() => {
    setStrokes([]);
    setDirty(false);
    dispatch(
      getAnnotations(sheetName, pageNumber, (loaded) => {
        setStrokes(loaded || []);
      })
    );
  }, [sheetName, pageNumber, dispatch]);

  const redraw = useCallback((strokesToDraw) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    (strokesToDraw || strokes).forEach((stroke) =>
      drawStroke(ctx, stroke, canvas.width, canvas.height)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  // Match the canvas's drawing buffer to its actual displayed size.
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerNode) return;
    const rect = containerNode.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    redraw();
  }, [redraw, containerNode]);

  // Resize whenever the container's actual box changes - this fires the
  // moment react-pdf finishes rendering the page at its real size (which
  // can happen well after mount, since PDF loading is async), not just on
  // browser window resize.
  useEffect(() => {
    if (!containerNode) return;
    resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(containerNode);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [containerNode, resize]);

  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  const getRelativePoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return {
      x: (point.clientX - rect.left) / rect.width,
      y: (point.clientY - rect.top) / rect.height,
    };
  };

  const startStroke = (e) => {
    if (!annotateMode) return;
    e.preventDefault();
    const point = getRelativePoint(e);

    if (tool === "text") {
      // Text doesn't drag - place it with one click/tap and prompt for its
      // content right away, rather than tracking a currentStrokeRef drag.
      const text = window.prompt("Annotation text:");
      if (text && text.trim()) {
        setStrokes((prev) => [
          ...prev,
          { tool: "text", color, points: [point], text: text.trim() },
        ]);
        setDirty(true);
      }
      return;
    }

    drawingRef.current = true;
    currentStrokeRef.current = { tool, color, points: [point] };
  };

  const continueStroke = (e) => {
    if (!annotateMode || !drawingRef.current) return;
    e.preventDefault();
    currentStrokeRef.current.points.push(getRelativePoint(e));
    const canvas = canvasRef.current;
    redraw();
    drawStroke(
      canvas.getContext("2d"),
      currentStrokeRef.current,
      canvas.width,
      canvas.height
    );
  };

  const endStroke = () => {
    if (!annotateMode || !drawingRef.current) return;
    drawingRef.current = false;
    const finished = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (finished && finished.points.length > 1) {
      setStrokes((prev) => [...prev, finished]);
      setDirty(true);
    }
  };

  const undo = () => {
    setStrokes((prev) => prev.slice(0, -1));
    setDirty(true);
  };

  const clearPage = () => {
    if (strokes.length === 0) return;
    if (
      !window.confirm(
        "Clear all annotations on this page? This can't be undone until you leave without saving."
      )
    ) {
      return;
    }
    setStrokes([]);
    setDirty(true);
  };

  const save = () => {
    setSaving(true);
    dispatch(
      saveAnnotation(
        sheetName,
        pageNumber,
        strokes,
        () => {
          setSaving(false);
          setDirty(false);
        },
        () => {
          setSaving(false);
        }
      )
    );
  };

  return {
    canvasRef,
    containerRef,
    strokes,
    tool,
    setTool,
    color,
    setColor,
    annotateMode,
    setAnnotateMode,
    saving,
    dirty,
    undo,
    clearPage,
    save,
    startStroke,
    continueStroke,
    endStroke,
    colors: ANNOTATION_COLORS,
  };
}

function drawStroke(ctx, stroke, canvasWidth, canvasHeight) {
  if (!stroke || !stroke.points || stroke.points.length === 0) return;

  if (stroke.tool === "text") {
    drawText(ctx, stroke, canvasWidth, canvasHeight);
    return;
  }

  if (stroke.points.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = stroke.color;
  ctx.globalAlpha = stroke.tool === "highlighter" ? 0.35 : 1;
  ctx.lineWidth = stroke.tool === "highlighter" ? 14 : 3;
  ctx.beginPath();
  stroke.points.forEach((p, i) => {
    const x = p.x * canvasWidth;
    const y = p.y * canvasHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

// Text strokes store a single anchor point (top-left, as a 0..1 fraction
// like everything else) plus the text itself. Font size is a fixed pixel
// value rather than fraction-scaled, matching how pen/highlighter line
// widths are already fixed pixel values in this file.
function drawText(ctx, stroke, canvasWidth, canvasHeight) {
  if (!stroke.text || !stroke.points[0]) return;
  const fontSize = 18;
  const x = stroke.points[0].x * canvasWidth;
  const y = stroke.points[0].y * canvasHeight;
  ctx.save();
  ctx.fillStyle = stroke.color;
  ctx.font = `bold ${fontSize}px "Open Sans", sans-serif`;
  ctx.textBaseline = "top";
  stroke.text.split("\n").forEach((line, i) => {
    ctx.fillText(line, x, y + i * (fontSize + 4));
  });
  ctx.restore();
}
