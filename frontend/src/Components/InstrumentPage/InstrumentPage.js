import React, { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router";
import SideBar from "../Sidebar/SideBar";
import { getInstrumentSheets } from "../../Redux/Actions/dataActions";
import { connect } from "react-redux";
import { dominantColors } from "../../Utils/colors";
import "../TagsPage/TagsPage.css";
import SheetBox from "../SheetsPage/Components/SheetBox";

// One instrument's filtered sheet list - the same shape as TagsPage, since
// an instrument is really just a tag drawn from the backend-managed
// instrument list (see the Instruments tab) rather than typed freely.
function InstrumentPage({ getInstrumentSheets }) {
  const { instrumentName } = useParams();
  const decoded = decodeURIComponent(instrumentName);

  const [sheets, setSheets] = useState(undefined);

  useEffect(() => {
    getInstrumentSheets(decoded, (data) => {
      setSheets(data || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoded]);

  return (
    <Fragment>
      <SideBar />
      <div className="home_content tags_page">
        <div className="header">
          <span
            className="dot"
            style={{
              backgroundColor:
                dominantColors[
                  Math.floor(Math.random() * dominantColors.length)
                ],
            }}
          />
          <h1>{decoded}</h1>
        </div>
        <div className="marg">
          {sheets === undefined ? (
            <p>loading</p>
          ) : sheets.length === 0 ? (
            <p>No sheets tagged with this instrument yet.</p>
          ) : (
            sheets.map((sheet) => {
              return <SheetBox sheet={sheet} key={sheet.sheet_name} />;
            })
          )}
        </div>
      </div>
    </Fragment>
  );
}

const mapStateToProps = (state) => ({});

const mapActionsToProps = {
  getInstrumentSheets,
};

export default connect(mapStateToProps, mapActionsToProps)(InstrumentPage);
