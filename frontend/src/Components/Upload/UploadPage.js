import React, { Fragment, useState } from "react";
import SideBar from "../Sidebar/SideBar";

import "./Upload.css";

import DragNDrop from "./DragNDrop";

import { connect } from "react-redux";
import { uploadSheet, resetData } from "../../Redux/Actions/dataActions";

function UploadPage(props) {
  return (
    <Fragment>
      <SideBar />
      <div className="home_content">
        <InteractiveForm uploadSheet={props.uploadSheet} resetData={props.resetData} />
      </div>
    </Fragment>
  );
}

const InteractiveForm = ({ uploadSheet, resetData }) => {
  const [firstButtonText, setfirstButtonText] = useState("Next Step");

  const [secondButtonText, setSecondButtonText] = useState("Upload");

  const [containerClasses, setcontainerClasses] = useState(
    "container slider-one-active"
  );

  const [requestData, setrequestData] = useState({
    uploadFile: undefined,
    composer: "",
    sheetName: "",
    releaseDate: "1999-12-31",
  });

  const [uploadFile, setUploadFile] = useState(undefined);
  const [error, setError] = useState(null);

  const firstButtonOnClick = (e) => {
    e.preventDefault();
    setfirstButtonText("Saving...");
    setcontainerClasses("container center slider-two-active");
  };

  // This is what was missing before: the wizard's second step had a file
  // picker but nothing that ever actually sent the file anywhere - clicking
  // through it just animated to a "success" screen with no upload having
  // happened. This now really calls the upload API.
  const secondButtonOnClick = (e) => {
    e.preventDefault();

    if (uploadFile === undefined) {
      setError("Choose a PDF first.");
      return;
    }

    setSecondButtonText("Uploading...");
    setError(null);

    uploadSheet(
      { ...requestData, uploadFile },
      () => {
        resetData();
        setcontainerClasses("container full slider-three-active");
      },
      (message) => {
        setSecondButtonText("Upload");
        setError(message);
      }
    );
  };

  const handleChange = (event) => {
    setrequestData({
      ...requestData,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <Fragment>
      <div class={containerClasses}>
        <div class="steps">
          <div class="step step-one">
            {/*<div class="liner"></div>*/}
            <span>Information</span>
          </div>
          <div class="step step-two">
            {/*<div class="liner"></div>*/}
            <span>Upload</span>
          </div>
          <div class="step step-three">
            {/*<div class="liner"></div>*/}
            <span>Conclusion</span>
          </div>
        </div>
        <div class="line">
          <div class="dot-move"></div>
          <div class="dot zero"></div>
          <div class="dot center"></div>
          <div class="dot full"></div>
        </div>
        <div class="slider-ctr">
          <div class="slider">
            <form class="slider-form slider-one">
              <h2>Type in the data of the sheet</h2>
              <label class="input">
                <input
                  type="text"
                  class="name"
                  name="sheetName"
                  placeholder="Sheet Name"
                  onChange={handleChange}
                />
                <input
                  type="text"
                  class="name"
                  name="composer"
                  placeholder="Composer"
                  onChange={handleChange}
                />
              </label>
              <button
                disabled={
                  requestData.sheetName === "" || requestData.composer === ""
                }
                class="first next interactive-form-button"
                onClick={firstButtonOnClick}
              >
                {firstButtonText}
              </button>
            </form>
            <form class="slider-form slider-two">
              <h2>Upload the PDF</h2>
              <DragNDrop giveModalData={(file) => setUploadFile(file)} />
              <button
                disabled={uploadFile === undefined}
                class="first next interactive-form-button"
                onClick={secondButtonOnClick}
              >
                {secondButtonText}
              </button>
              {error && (
                <div style={{ color: "#bf616a", marginTop: "10px" }}>
                  {error}
                </div>
              )}
            </form>
            <div class="slider-form slider-three three">
              <h2>
                The Sheet, <span class="yourname">{requestData.sheetName}</span>
              </h2>
              <h3 className="minus-marg">has been succesfully uploaded</h3>
              <a class="reset" href="/">
                Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

const mapActionsToProps = {
  uploadSheet,
  resetData,
};

export default connect(null, mapActionsToProps)(UploadPage);
