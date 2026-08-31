package forms

import "github.com/SheetAble/SheetAble/backend/api/models"

// SaveAnnotationRequest is the body for
// PUT /api/sheet/:sheetName/annotations/:pageNumber - the complete,
// current set of strokes for that page (not a diff against what's stored).
type SaveAnnotationRequest struct {
	Strokes []models.Stroke `json:"strokes"`
}
