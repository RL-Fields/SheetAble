import React, { Fragment, useEffect, useState } from "react";
import { connect } from "react-redux";
import axios from "axios";

import SideBar from "../Sidebar/SideBar";
import {
  bulkDeleteSheets,
  bulkAppendTag,
  resetData,
} from "../../Redux/Actions/dataActions";

import "./ManageSheetsPage.css";

/*
  A dedicated bulk-management view: browse every sheet, tick the ones you
  want, then delete them or apply a tag to all of them in one request.
  Kept separate from the read-only SheetsPage/Sheets browsing views so
  clicking a sheet there still opens it, rather than fighting over what a
  click means.
*/
function ManageSheetsPage({ bulkDeleteSheets, bulkAppendTag, resetData }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [tagValue, setTagValue] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(null);

  const loadSheets = () => {
    setLoading(true);
    axios
      // The backend defaults to a page size of 10 - ask for a large page
      // instead of paginating, since this view is meant for bulk actions
      // across the whole library at once.
      .get("/sheets", { params: { limit: 2000, sort_by: "sheet_name asc" } })
      .then((res) => {
        setSheets(res.data.rows || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    document.title = "SheetAble - Manage Sheets";
    loadSheets();
  }, []);

  const toggleSelected = (safeSheetName) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(safeSheetName)) {
        next.delete(safeSheetName);
      } else {
        next.add(safeSheetName);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(sheets.map((s) => s.safe_sheet_name)));
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} sheet${selected.size === 1 ? "" : "s"}? This can't be undone.`
      )
    ) {
      return;
    }
    setWorking(true);
    bulkDeleteSheets(
      Array.from(selected),
      (result) => {
        setWorking(false);
        setMessage(
          `Deleted ${result.succeeded} of ${result.total}${
            result.failed > 0 ? ` (${result.failed} failed)` : ""
          }.`
        );
        clearSelection();
        resetData();
        loadSheets();
      },
      (errorMessage) => {
        setWorking(false);
        setMessage(`Delete failed: ${errorMessage}`);
      }
    );
  };

  const handleBulkTag = () => {
    if (selected.size === 0 || tagValue.trim() === "") return;
    setWorking(true);
    bulkAppendTag(
      Array.from(selected),
      tagValue.trim(),
      (result) => {
        setWorking(false);
        setMessage(
          `Tagged ${result.succeeded} of ${result.total} with "${tagValue.trim()}"${
            result.failed > 0 ? ` (${result.failed} failed)` : ""
          }.`
        );
        setTagValue("");
        clearSelection();
        resetData();
      },
      (errorMessage) => {
        setWorking(false);
        setMessage(`Tagging failed: ${errorMessage}`);
      }
    );
  };

  return (
    <Fragment>
      <SideBar />
      <div className="home_content">
        <div className="doc_header auto-margin">
          <span className="doc_sheet">Manage your library</span>
          <br />
          <span className="doc_composer">
            Select sheets to bulk delete or tag them
          </span>
        </div>

        <div className="manage-toolbar">
          <button onClick={selectAll} disabled={loading || sheets.length === 0}>
            Select all ({sheets.length})
          </button>
          <button onClick={clearSelection} disabled={selected.size === 0}>
            Clear selection
          </button>
          <span className="manage-selected-count">
            {selected.size} selected
          </span>

          <button
            className="manage-danger"
            onClick={handleBulkDelete}
            disabled={selected.size === 0 || working}
          >
            Delete selected
          </button>

          <input
            type="text"
            placeholder="Tag value"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            className="manage-tag-input"
          />
          <button
            onClick={handleBulkTag}
            disabled={selected.size === 0 || tagValue.trim() === "" || working}
          >
            Add tag to selected
          </button>
        </div>

        {message && <div className="manage-message">{message}</div>}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul className="all-sheets-container full-height manage-sheets-grid">
            {sheets.map((sheet) => (
              <li
                key={sheet.safe_sheet_name}
                className={
                  selected.has(sheet.safe_sheet_name)
                    ? "li-height manage-selected"
                    : "li-height"
                }
                onClick={() => toggleSelected(sheet.safe_sheet_name)}
              >
                <div className="box-container remove_shadow">
                  <input
                    type="checkbox"
                    className="manage-checkbox"
                    checked={selected.has(sheet.safe_sheet_name)}
                    onChange={() => toggleSelected(sheet.safe_sheet_name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <img
                    className="thumbnail-image"
                    src={`${axios.defaults.baseURL}/sheet/thumbnail/${sheet.safe_sheet_name}`}
                    alt="Sheet Thumbnail"
                  />
                  <div className="sheet-name-container">
                    <span className="sheet-name">{sheet.sheet_name}</span>
                  </div>
                  <div className="sheet-composer-container">
                    <span className="sheet-composer">{sheet.composer}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Fragment>
  );
}

const mapActionsToProps = {
  bulkDeleteSheets,
  bulkAppendTag,
  resetData,
};

export default connect(null, mapActionsToProps)(ManageSheetsPage);
