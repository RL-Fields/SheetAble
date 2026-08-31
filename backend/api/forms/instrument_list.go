package forms

// InstrumentListRequest is used for adding/removing an instrument from the
// master instrument list (as opposed to forms.InstrumentRequest, which
// tags/untags one sheet with an already-known instrument).
type InstrumentListRequest struct {
	Name string `form:"name"`
}
