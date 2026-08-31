package models

import (
	"encoding/json"
	"time"

	"github.com/jinzhu/gorm"
)

/*
	SheetAnnotation stores one page's worth of freehand annotation strokes
	for a sheet, as a JSON blob. Annotations are SHARED - one set per
	(sheet, page), visible and editable by everyone who can view the sheet,
	not per-user. Saving is explicit (a Save button in the UI), so a row
	here always represents the last saved state, not a live/partial draw.
*/
type SheetAnnotation struct {
	ID            uint      `gorm:"primary_key" json:"id"`
	SafeSheetName string    `gorm:"not null;unique_index:idx_sheet_page" json:"safe_sheet_name"`
	PageNumber    int       `gorm:"not null;unique_index:idx_sheet_page" json:"page_number"`
	StrokesJSON   string    `gorm:"type:text" json:"-"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Stroke is one mark on the page: either a freehand path (Tool "pen" or
// "highlighter", Points holding every point along the drag) or a text note
// (Tool "text", Points holding a single anchor point and Text holding the
// note's content). Points are fractions (0..1) of the page's rendered
// width/height - not pixels - so annotations line up correctly regardless
// of what size the PDF happens to be displayed at (desktop vs. mobile
// width, zoom, etc.). Text is empty/omitted for freehand strokes.
type Stroke struct {
	Tool   string  `json:"tool"`
	Color  string  `json:"color"`
	Points []Point `json:"points"`
	Text   string  `json:"text,omitempty"`
}

type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// GetPageAnnotation returns the saved strokes for one page of a sheet. No
// saved row just means "nothing drawn here yet" - that's not an error, it
// returns an empty slice.
func GetPageAnnotation(db *gorm.DB, safeSheetName string, pageNumber int) ([]Stroke, error) {
	var row SheetAnnotation
	err := db.Where("safe_sheet_name = ? AND page_number = ?", safeSheetName, pageNumber).Take(&row).Error
	if err != nil {
		if gorm.IsRecordNotFoundError(err) {
			return []Stroke{}, nil
		}
		return nil, err
	}

	strokes := []Stroke{}
	if row.StrokesJSON != "" {
		if err := json.Unmarshal([]byte(row.StrokesJSON), &strokes); err != nil {
			return nil, err
		}
	}
	return strokes, nil
}

// SavePageAnnotation replaces the full set of strokes for one page - an
// upsert keyed on (safe_sheet_name, page_number). Called once per explicit
// Save click from the frontend with the complete current stroke list for
// that page (not a diff/append), which keeps this simple and avoids the
// stored data growing unboundedly from undo/redo churn during a session.
func SavePageAnnotation(db *gorm.DB, safeSheetName string, pageNumber int, strokes []Stroke) error {
	if strokes == nil {
		strokes = []Stroke{}
	}
	data, err := json.Marshal(strokes)
	if err != nil {
		return err
	}

	var row SheetAnnotation
	err = db.Where("safe_sheet_name = ? AND page_number = ?", safeSheetName, pageNumber).Take(&row).Error
	if err != nil {
		if !gorm.IsRecordNotFoundError(err) {
			return err
		}
		row = SheetAnnotation{SafeSheetName: safeSheetName, PageNumber: pageNumber}
	}
	row.StrokesJSON = string(data)
	row.UpdatedAt = time.Now()

	if row.ID == 0 {
		return db.Create(&row).Error
	}
	return db.Save(&row).Error
}

// DeleteAnnotationsForSheet removes every page's annotations for a sheet.
// Called when the sheet itself is deleted so rows don't pile up orphaned
// with no sheet to belong to.
func DeleteAnnotationsForSheet(db *gorm.DB, safeSheetName string) error {
	return db.Where("safe_sheet_name = ?", safeSheetName).Delete(&SheetAnnotation{}).Error
}
