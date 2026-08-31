package forms

// BulkSheetNamesRequest is used by bulk-delete: a plain list of safe sheet
// names to act on. Sent as JSON.
type BulkSheetNamesRequest struct {
	SheetNames []string `json:"sheet_names"`
}

// BulkTagRequest is used by the bulk tag add/remove endpoints: apply (or
// remove) a single tag across many sheets at once. Sent as JSON.
type BulkTagRequest struct {
	SheetNames []string `json:"sheet_names"`
	TagValue   string   `json:"tag_value"`
}

// BulkComposerRequest is used by the bulk composer endpoint: set (replace)
// the composer for many sheets at once. Sent as JSON.
type BulkComposerRequest struct {
	SheetNames []string `json:"sheet_names"`
	Composer   string   `json:"composer"`
}

// BulkInstrumentRequest is used by the bulk instrument add/remove
// endpoints: apply (or remove) a single instrument across many sheets at
// once - same shape as BulkTagRequest, kept separate since instruments are
// their own column, not mixed into free-text tags. Sent as JSON.
type BulkInstrumentRequest struct {
	SheetNames      []string `json:"sheet_names"`
	InstrumentValue string   `json:"instrument_value"`
}
