import React, { Fragment, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { connect } from "react-redux";
import SideBar from "../Sidebar/SideBar";
import {
  getInstrumentsList,
  addInstrumentToList,
  deleteInstrumentFromList,
} from "../../Redux/Actions/dataActions";
import { dominantColors } from "../../Utils/colors";
import "./InstrumentsPage.css";

// The instrument tab, browsable like Composers. The list itself is
// backend-managed (not hardcoded) so instruments can be added/removed from
// here - it's fetched fresh on load rather than kept in Redux, same as
// ManageSheetsPage does for sheets.
function InstrumentsPage({
  getInstrumentsList,
  addInstrumentToList,
  deleteInstrumentFromList,
}) {
  const history = useHistory();
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newInstrument, setNewInstrument] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(null);

  const loadInstruments = () => {
    setLoading(true);
    getInstrumentsList(
      (data) => {
        setInstruments(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  };

  useEffect(() => {
    document.title = "SheetAble - Instruments";
    loadInstruments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newInstrument.trim() === "" || working) return;
    setWorking(true);
    addInstrumentToList(
      newInstrument.trim(),
      () => {
        setWorking(false);
        setNewInstrument("");
        setMessage(null);
        loadInstruments();
      },
      (errorMessage) => {
        setWorking(false);
        setMessage(`Couldn't add instrument: ${errorMessage}`);
      }
    );
  };

  const handleDelete = (instrument) => {
    if (
      !window.confirm(
        `Remove "${instrument.name}" from the instrument list? Sheets already tagged with it keep that tag - it just won't be offered or browsable any more.`
      )
    ) {
      return;
    }
    setWorking(true);
    deleteInstrumentFromList(
      instrument.name,
      () => {
        setWorking(false);
        setMessage(null);
        loadInstruments();
      },
      (errorMessage) => {
        setWorking(false);
        setMessage(`Couldn't remove instrument: ${errorMessage}`);
      }
    );
  };

  return (
    <Fragment>
      <SideBar />
      <div className="home_content">
        <div className="sheets-wrapper composer-wrapper">
          <div className="doc_header auto-margin">
            <span className="doc_sheet">Instruments</span>
            <br />
            <span className="doc_composer">
              Browse your library by instrument
            </span>
          </div>

          <form className="auto-margin instrument-add-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="New instrument name"
              value={newInstrument}
              onChange={(e) => setNewInstrument(e.target.value)}
              className="manage-tag-input"
            />
            <button type="submit" disabled={newInstrument.trim() === "" || working}>
              Add instrument
            </button>
            {message && <span className="instrument-message">{message}</span>}
          </form>

          <div className="middle-part-container">
            {loading ? (
              <p className="auto-margin">Loading...</p>
            ) : (
              <ul className="all-sheets-container full-height instrument-grid">
                {instruments.map((instrument, i) => (
                  <li key={instrument.safe_name} className="li-height">
                    <div className="box-container remove_shadow instrument-box">
                      <button
                        type="button"
                        className="instrument-remove-btn"
                        title={`Remove ${instrument.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(instrument);
                        }}
                      >
                        ×
                      </button>
                      <div
                        onClick={() =>
                          history.push(
                            `/instrument/${encodeURIComponent(instrument.name)}`
                          )
                        }
                      >
                        <span
                          className="dot instrument-dot"
                          style={{
                            backgroundColor:
                              dominantColors[i % dominantColors.length],
                          }}
                        />
                        <div className="sheet-name-container">
                          <span className="sheet-name">{instrument.name}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

const mapActionsToProps = {
  getInstrumentsList,
  addInstrumentToList,
  deleteInstrumentFromList,
};

export default connect(null, mapActionsToProps)(InstrumentsPage);
