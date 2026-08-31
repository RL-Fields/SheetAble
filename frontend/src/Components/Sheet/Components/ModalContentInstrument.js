import Button from "@material-ui/core/Button";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  addInstrument,
  deleteInstrument,
  getInstrumentsList,
} from "../../../Redux/Actions/dataActions";

/*
  A checkbox list rather than free text - instrument is chosen from the
  backend-managed master list (see the Instruments tab, which can add/
  remove entries) so the browse tab never ends up with near-duplicate
  entries. Checking/unchecking fires immediately (matches how the rest of
  this app's small edit forms - like tags - already work, reloading the
  page on each change) rather than needing a separate Save.
*/
function ModalContentInstrument(props) {
  const [instruments, setInstruments] = useState([]);

  useEffect(() => {
    props.getInstrumentsList((data) => setInstruments(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {instruments.length === 0 && (
          <p>
            No instruments set up yet - add some from the Instruments tab.
          </p>
        )}
        {instruments.map((instrument) => (
          <label
            key={instrument.safe_name}
            style={{ display: "block", textAlign: "left", padding: "2px 0" }}
          >
            <input
              type="checkbox"
              checked={props.instruments.includes(instrument.name)}
              onChange={(e) => toggle(instrument.name, e.target.checked)}
            />{" "}
            {instrument.name}
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
  getInstrumentsList,
};

const mapStateToProps = (state) => ({});

export default connect(
  mapStateToProps,
  mapActionsToProps
)(ModalContentInstrument);
