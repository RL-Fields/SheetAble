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
