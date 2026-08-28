import React from "react";

// Import React FilePond
import { FilePond, registerPlugin } from "react-filepond";

// Import the plugin code
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";

// Import FilePond styles
import "filepond/dist/filepond.min.css";

// Redux Imports
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { uploadSheet } from "../../Redux/Actions/dataActions";

registerPlugin(FilePondPluginFileValidateType);

// `allowMultiple` opts into selecting/dropping several PDFs at once (used by
// the bulk upload modal). Defaults to the original single-file behaviour so
// existing callers (the single-sheet upload modal) are unaffected.
function DragNDrop({ giveModalData, allowMultiple = false, maxFiles = 1 }) {
  //const [files, setFiles] = useState(undefined)

  const uploadFinish = (files) => {
    if (allowMultiple) {
      giveModalData(files.map((f) => f.file));
    } else {
      giveModalData(files[0] ? files[0].file : undefined);
    }
  };

  const removeFile = () => {
    if (!allowMultiple) {
      giveModalData(undefined);
    }
  };

  return (
    <div className="upload-container">
      <FilePond
        onupdatefiles={(files) => {
          uploadFinish(files);
        }}
        onremovefile={removeFile}
        allowMultiple={allowMultiple}
        server={{
          process: (
            fieldName,
            file,
            metadata,
            load,
            error,
            progress,
            abort,
            transfer,
            options
          ) => {
            load();
          },
        }}
        maxFiles={allowMultiple ? maxFiles : 1}
        name="files"
        labelIdle={
          allowMultiple
            ? 'Drag & Drop your PDFs or <span class="filepond--label-action">Browse</span>'
            : 'Drag & Drop your file or <span class="filepond--label-action">Browse</span>'
        }
        credits={false}
        allowFileTypeValidation={true}
        acceptedFileTypes={["application/pdf"]}
      />
    </div>
  );
}

DragNDrop.propTypes = {
  uploadSheet: PropTypes.func.isRequired,
};

const mapActionsToProps = {
  uploadSheet,
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps, mapActionsToProps)(DragNDrop);
