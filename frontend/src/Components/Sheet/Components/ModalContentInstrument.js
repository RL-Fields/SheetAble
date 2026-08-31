import Button from "@material-ui/core/Button";
import React from "react";
import { connect } from "react-redux";
import {
  addInstrument,
  deleteInstrument,
} from "../../../Redux/Actions/dataActions";
import { INSTRUMENTS } from "../../../Utils/instruments";

/*
  A checkbox list rather than free text - instrument is a fixed vocabulary
  (see Utils/instruments.js) so the browse tab never ends up with
  near-duplicate entries. Checking/unchecking fires immediately (matches
  how the rest of this app's small edit forms - like tags - already work,
  reloading the page on each change) rather than needing a separate Save.
*/
function ModalContentInstrument(props) {
  const toggle = (instrument, checked) => {
    if (checked) {
      props.addInstrument(instrument, props.sheetName);
    } else {
      props.deleteInstrument(instrument, props.sheetName);
    }
  };

  return (
    <div className="add_tag delete_tag">
      <form noValidate autoComplete="off">
        {INSTRUMENTS.map((instrument) => (
          <label
            key={instrument}
            style={{ display: "block", textAlign: "left", padding: "2px 0" }}
          >
            <input
              type="checkbox"
              checked={props.instruments.includes(instrument)}
              onChange={(e) => toggle(instrument, e.target.checked)}
            />{" "}
            {instrument}
          </label>
        ))}
      </form>
      <div className="buttons">
        <Button variant="contained" color="primary" onClick={props.onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

const mapActionsToProps = {
  addInstrument,
  deleteInstrument,
};

const mapStateToProps = (state) => ({});

export default connect(
  mapStateToProps,
  mapActionsToProps
)(ModalContentInstrument);
