import React, { useState, useEffect } from "react";
import TextField from "@material-ui/core/TextField";
import DragNDrop from "../../Upload/DragNDrop";
import Button from "@material-ui/core/Button";

import { connect } from "react-redux";
import { uploadSheet, resetData } from "../../../Redux/Actions/dataActions";

function ModalContent(props) {
  const [disabled, setDisabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const [requestData, setRequestData] = useState({
    composer: "",
    sheetName: "",
    releaseDate: "1999-12-31",
  });

  const [uploadFile, setUploadFile] = useState(undefined);

  const giveModalData = (file) => {
    setUploadFile(file);
  };

  useEffect(() => {
    if (
      requestData.composer !== "" &&
      requestData.sheetName !== "" &&
      uploadFile !== undefined
    ) {
      setDisabled(false);
    } else if (uploadFile === undefined) {
      setDisabled(true);
    }
  }, [requestData, uploadFile]);

  const handleChange = (event) => {
    setRequestData({
      ...requestData,
      [event.target.name]: event.target.value,
    });
  };

  const sendRequest = () => {
    const newData = {
      ...requestData,
      uploadFile: uploadFile,
    };

    setUploading(true);
    setError(null);

    props.uploadSheet(
      newData,
      () => {
        props.resetData();
        props.onClose();
        window.location.reload();
      },
      (message) => {
        // Previously a failed request left this button stuck with no
        // feedback at all, since nothing ever ran on failure.
        setUploading(false);
        setError(message);
      }
    );
  };

  return (
    <div className="upload">
      <form noValidate autoComplete="off">
        <TextField
          id="standard-basic"
          label="Sheet Name"
          className="form-field"
          name="sheetName"
          onChange={handleChange}
        />
        <TextField
          id="standard-basic"
          label="Composer"
          className="form-field comp"
          name="composer"
          onChange={handleChange}
        />
      </form>
      <DragNDrop giveModalData={giveModalData} />
      <Button
        variant="contained"
        color="primary"
        disabled={disabled || uploading}
        onClick={sendRequest}
      >
        {uploading ? "Uploading..." : "Upload"}
      </Button>
      {error && (
        <div style={{ color: "#bf616a", marginTop: "10px" }}>{error}</div>
      )}
    </div>
  );
}

const mapActionsToProps = {
  uploadSheet,
  resetData,
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps, mapActionsToProps)(ModalContent);
