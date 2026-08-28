import React, { useState } from "react";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

import DragNDrop from "./DragNDrop";

import { connect } from "react-redux";
import { bulkUploadSheets, resetData } from "../../Redux/Actions/dataActions";

/*
  Bulk-upload several PDFs at once under one shared composer/tags.
  Sheet names are taken from each file's filename (see backend
  BulkUploadFile), so this form only needs the fields shared across the
  whole batch.
*/
function BulkUploadModal(props) {
  const [requestData, setRequestData] = useState({
    composer: "",
    releaseDate: "1999-12-31",
    tags: "",
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    setRequestData({
      ...requestData,
      [event.target.name]: event.target.value,
    });
  };

  const giveModalData = (selectedFiles) => {
    setFiles(selectedFiles || []);
  };

  const sendRequest = () => {
    setUploading(true);
    setSummary(null);
    setError(null);

    props.bulkUploadSheets(
      { ...requestData, files },
      (data) => {
        setUploading(false);
        setSummary(data);
        props.resetData();
      },
      (message) => {
        // Previously a failed request left the button stuck disabled
        // forever with no feedback - this is what fixes that.
        setUploading(false);
        setError(message);
      }
    );
  };

  const disabled = files.length === 0 || uploading;

  return (
    <div className="upload">
      <form noValidate autoComplete="off">
        <TextField
          id="standard-basic"
          label="Composer (applied to all files)"
          className="form-field comp"
          name="composer"
          onChange={handleChange}
        />
        <TextField
          id="standard-basic"
          label="Tags (comma separated, optional)"
          className="form-field"
          name="tags"
          onChange={handleChange}
        />
      </form>
      <DragNDrop
        giveModalData={giveModalData}
        allowMultiple={true}
        maxFiles={100}
      />
      <Button
        variant="contained"
        color="primary"
        disabled={disabled}
        onClick={sendRequest}
      >
        {uploading
          ? "Uploading..."
          : `Upload ${files.length || ""} sheet${
              files.length === 1 ? "" : "s"
            }`}
      </Button>

      {error && (
        <div style={{ color: "#bf616a", marginTop: "10px" }}>{error}</div>
      )}

      {summary && (
        <div className="bulk-upload-summary">
          <p>
            {summary.uploaded} of {summary.total} uploaded
            {summary.failed > 0 ? `, ${summary.failed} failed` : ""}.
          </p>
          {summary.failed > 0 && (
            <ul>
              {summary.results
                .filter((r) => !r.success)
                .map((r) => (
                  <li key={r.sheet_name}>
                    {r.sheet_name}: {r.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const mapActionsToProps = {
  bulkUploadSheets,
  resetData,
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps, mapActionsToProps)(BulkUploadModal);
