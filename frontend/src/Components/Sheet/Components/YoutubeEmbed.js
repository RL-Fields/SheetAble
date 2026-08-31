import React, { useState } from "react";
import { connect } from "react-redux";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import EditIcon from "@material-ui/icons/Edit";
import Modal from "../../Sidebar/Modal/Modal";
import { editYoutubeUrl } from "../../../Redux/Actions/dataActions";

// Pull a video ID out of any of the common YouTube URL shapes someone might
// paste in (watch?v=, youtu.be/, embed/, shorts/, with or without extra
// query params tacked on) - null if it doesn't look like a YouTube URL.
export function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  );
  return match ? match[1] : null;
}

// A performance video linked to the sheet, embedded as a YouTube player.
// Optional - shows just an "Add YouTube video" affordance until one is set.
function YoutubeEmbed({ youtubeUrl, sheetName, editYoutubeUrl }) {
  const [modal, setModal] = useState(false);
  const [value, setValue] = useState(youtubeUrl || "");
  const [error, setError] = useState(null);

  const videoId = extractYoutubeId(youtubeUrl);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed !== "" && !extractYoutubeId(trimmed)) {
      setError("That doesn't look like a YouTube link.");
      return;
    }
    setError(null);
    editYoutubeUrl(trimmed, sheetName);
  };

  const remove = () => {
    setValue("");
    editYoutubeUrl("", sheetName);
  };

  return (
    <div className="youtube-embed-wrapper">
      {videoId && (
        <div className="youtube-embed">
          <iframe
            width="100%"
            height="215"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <div className="add youtube-edit-btn" onClick={() => setModal(true)}>
        <IconButton>
          <EditIcon />
        </IconButton>
        <span>{videoId ? "Change video" : "Add YouTube video"}</span>
      </div>
      <Modal title="YouTube Video" onClose={() => setModal(false)} show={modal}>
        <div className="add_tag delete_tag">
          <form noValidate autoComplete="off">
            <TextField
              id="standard-basic"
              label="YouTube URL"
              className="form-field"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </form>
          {error && <p style={{ color: "#bf616a" }}>{error}</p>}
          <div className="buttons">
            <Button variant="contained" color="primary" onClick={save}>
              Save
            </Button>
            {videoId && (
              <Button variant="contained" onClick={remove}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

const mapActionsToProps = {
  editYoutubeUrl,
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps, mapActionsToProps)(YoutubeEmbed);
