import React, { Fragment } from "react";
import { useHistory } from "react-router-dom";
import SideBar from "../Sidebar/SideBar";
import { INSTRUMENTS } from "../../Utils/instruments";
import { dominantColors } from "../../Utils/colors";
import "./InstrumentsPage.css";

// The instrument tab, browsable like Composers - but unlike composers,
// instruments are a small fixed list (see Utils/instruments.js) rather
// than something that grows as sheets get uploaded, so this page needs no
// pagination or backend fetch: it just lists the fixed set as cards, each
// linking through to /instrument/:name for the actual filtered sheet list.
function InstrumentsPage() {
  const history = useHistory();

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
          <div className="middle-part-container">
            <ul className="all-sheets-container full-height">
              {INSTRUMENTS.map((instrument, i) => (
                <li
                  key={instrument}
                  className="li-height"
                  onClick={() =>
                    history.push(
                      `/instrument/${encodeURIComponent(instrument)}`
                    )
                  }
                >
                  <div className="box-container remove_shadow instrument-box">
                    <span
                      className="dot instrument-dot"
                      style={{
                        backgroundColor:
                          dominantColors[i % dominantColors.length],
                      }}
                    />
                    <div className="sheet-name-container">
                      <span className="sheet-name">{instrument}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default InstrumentsPage;
