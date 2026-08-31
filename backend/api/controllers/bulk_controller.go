/*
	Bulk actions across many sheets at once: delete, and add/remove a tag.
	Each endpoint keeps going even if an individual sheet fails (not found,
	already deleted, etc.) and reports a per-sheet result, rather than
	aborting the whole batch on the first error.
*/

package controllers

import (
	"errors"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/SheetAble/SheetAble/backend/api/auth"
	. "github.com/SheetAble/SheetAble/backend/api/config"
	"github.com/SheetAble/SheetAble/backend/api/forms"
	"github.com/SheetAble/SheetAble/backend/api/models"
	"github.com/SheetAble/SheetAble/backend/api/utils"
	"github.com/gin-gonic/gin"
)

var (
	errNoSheetNames      = errors.New("no sheet_names given")
	errNoTagValue        = errors.New("no tag_value given")
	errNoComposer        = errors.New("no composer given")
	errNoInstrumentValue = errors.New("no instrument_value given")
)

type bulkItemResult struct {
	SheetName string `json:"sheet_name"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

func requireAuth(c *gin.Context) bool {
	token := utils.ExtractToken(c)
	uid, err := auth.ExtractTokenID(token, Config().ApiSecret)
	if err != nil || uid == 0 {
		c.String(http.StatusUnauthorized, "Unauthorized")
		return false
	}
	return true
}

func bindBulkJSON(c *gin.Context, out interface{}) bool {
	if err := c.ShouldBindJSON(out); err != nil {
		utils.DoError(c, http.StatusBadRequest, err)
		return false
	}
	return true
}

func respondBulk(c *gin.Context, results []bulkItemResult) {
	succeeded := 0
	for _, r := range results {
		if r.Success {
			succeeded++
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"succeeded": succeeded,
		"failed":    len(results) - succeeded,
		"total":     len(results),
		"results":   results,
	})
}

/*
Delete many sheets at once.
POST/DELETE /api/sheets/bulk
Body (JSON): { "sheet_names": ["etude-n-1", "fuer-elise", ...] }
*/
func (server *Server) BulkDeleteSheets(c *gin.Context) {
	if !requireAuth(c) {
		return
	}

	var req forms.BulkSheetNamesRequest
	if !bindBulkJSON(c, &req) {
		return
	}
	if len(req.SheetNames) == 0 {
		utils.DoError(c, http.StatusBadRequest, errNoSheetNames)
		return
	}

	results := make([]bulkItemResult, 0, len(req.SheetNames))
	for _, sheetName := range req.SheetNames {
		var sheet models.Sheet
		_, err := sheet.DeleteSheet(server.DB, sheetName)
		if err != nil {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: err.Error()})
			continue
		}
		results = append(results, bulkItemResult{SheetName: sheetName, Success: true})
	}

	respondBulk(c, results)
}

/*
Add one tag to many sheets at once.
POST /api/tag/bulk
Body (JSON): { "sheet_names": [...], "tag_value": "grade-5" }
*/
func (server *Server) BulkAppendTag(c *gin.Context) {
	if !requireAuth(c) {
		return
	}

	var req forms.BulkTagRequest
	if !bindBulkJSON(c, &req) {
		return
	}
	if req.TagValue == "" {
		utils.DoError(c, http.StatusBadRequest, errNoTagValue)
		return
	}
	if len(req.SheetNames) == 0 {
		utils.DoError(c, http.StatusBadRequest, errNoSheetNames)
		return
	}

	results := make([]bulkItemResult, 0, len(req.SheetNames))
	for _, sheetName := range req.SheetNames {
		var sheetModel models.Sheet
		sheet, err := sheetModel.FindSheetBySafeName(server.DB, sheetName)
		if err != nil {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "sheet not found"})
			continue
		}
		sheet.AppendTag(server.DB, req.TagValue)
		results = append(results, bulkItemResult{SheetName: sheetName, Success: true})
	}

	respondBulk(c, results)
}

/*
Remove one tag from many sheets at once.
POST/DELETE /api/tag/bulk/delete
Body (JSON): { "sheet_names": [...], "tag_value": "grade-5" }
*/
func (server *Server) BulkDeleteTag(c *gin.Context) {
	if !requireAuth(c) {
		return
	}

	var req forms.BulkTagRequest
	if !bindBulkJSON(c, &req) {
		return
	}
	if req.TagValue == "" {
		utils.DoError(c, http.StatusBadRequest, errNoTagValue)
		return
	}
	if len(req.SheetNames) == 0 {
		utils.DoError(c, http.StatusBadRequest, errNoSheetNames)
		return
	}

	results := make([]bulkItemResult, 0, len(req.SheetNames))
	for _, sheetName := range req.SheetNames {
		var sheetModel models.Sheet
		sheet, err := sheetModel.FindSheetBySafeName(server.DB, sheetName)
		if err != nil {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "sheet not found"})
			continue
		}
		if !sheet.DelteTag(server.DB, req.TagValue) {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "tag not found on sheet"})
			continue
		}
		results = append(results, bulkItemResult{SheetName: sheetName, Success: true})
	}

	respondBulk(c, results)
}

/*
Set (replace) the composer for many sheets at once - resolves/creates the
target composer once for the whole batch (same reasoning as bulk upload:
avoid hammering the OpenOpus API once per sheet) and moves each sheet's PDF
into that composer's folder on disk to match.
POST /api/composer/bulk
Body (JSON): { "sheet_names": [...], "composer": "Chopin" }
*/
func (server *Server) BulkSetComposer(c *gin.Context) {
	if !requireAuth(c) {
		return
	}

	var req forms.BulkComposerRequest
	if !bindBulkJSON(c, &req) {
		return
	}
	if req.Composer == "" {
		utils.DoError(c, http.StatusBadRequest, errNoComposer)
		return
	}
	if len(req.SheetNames) == 0 {
		utils.DoError(c, http.StatusBadRequest, errNoSheetNames)
		return
	}

	comp := safeComposer(server, req.Composer)
	targetDir := path.Join(Config().ConfigPath, "sheets/uploaded-sheets", comp.SafeName)
	utils.CreateDir(targetDir)

	results := make([]bulkItemResult, 0, len(req.SheetNames))
	for _, sheetName := range req.SheetNames {
		var sheetModel models.Sheet
		sheet, err := sheetModel.FindSheetBySafeName(server.DB, sheetName)
		if err != nil {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "sheet not found"})
			continue
		}

		oldPath := path.Join(Config().ConfigPath, "sheets/uploaded-sheets", sheet.SafeComposer, sheet.SafeSheetName+".pdf")
		newPath := path.Join(targetDir, sheet.SafeSheetName+".pdf")

		if oldPath != newPath {
			if err := os.Rename(oldPath, newPath); err != nil && !os.IsNotExist(err) {
				results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "failed to move pdf: " + err.Error()})
				continue
			}
		}

		err = server.DB.Model(&models.Sheet{}).Where("safe_sheet_name = ?", sheetName).Updates(map[string]interface{}{
			"safe_composer": comp.SafeName,
			"composer":      comp.CompleteName,
			"pdf_url":       "sheet/pdf/" + comp.SafeName + "/" + sheet.SafeSheetName,
		}).Error
		if err != nil {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: err.Error()})
			continue
		}

		results = append(results, bulkItemResult{SheetName: sheetName, Success: true})
	}

	respondBulk(c, results)
}

/*
Re-resolve portraits for composers already in the library whose portrait is
missing or still pointing at the generic "unknown person" placeholder -
covers composers created before the Wikipedia portrait lookup existed (see
safeComposer/getWikipediaPortrait in uploader.go). Safe to re-run any time;
a composer that already has a real portrait is left untouched.
POST /api/composers/backfill-portraits
*/
func (server *Server) BackfillComposerPortraits(c *gin.Context) {
	if !requireAuth(c) {
		return
	}

	var composers []models.Composer
	server.DB.Find(&composers)

	updated := 0
	for _, composer := range composers {
		if composer.Name == "Unknown" {
			continue
		}
		if composer.PortraitURL != "" && !strings.Contains(composer.PortraitURL, "icon-library.com") {
			// Already has a real portrait (Wikipedia, or one manually
			// uploaded via the composer edit modal) - leave it alone.
			continue
		}

		portrait := getWikipediaPortrait(composer.Name)
		if portrait == "" {
			continue
		}

		server.DB.Model(&models.Composer{}).Where("safe_name = ?", composer.SafeName).Update("portrait_url", portrait)
		updated++
	}

	c.JSON(http.StatusOK, gin.H{
		"total":   len(composers),
		"updated": updated,
	})
}

/*
Add one instrument to many sheets at once - additive, same as bulk tag add
(a sheet keeps whatever instruments it already had).
POST /api/instrument/bulk
Body (JSON): { "sheet_names": [...], "instrument_value": "Piano" }
*/
func (server *Server) BulkAddInstrument(c *gin.Context) {
	if !requireAuth(c) {
		return
	}

	var req forms.BulkInstrumentRequest
	if !bindBulkJSON(c, &req) {
		return
	}
	if req.InstrumentValue == "" {
		utils.DoError(c, http.StatusBadRequest, errNoInstrumentValue)
		return
	}
	if len(req.SheetNames) == 0 {
		utils.DoError(c, http.StatusBadRequest, errNoSheetNames)
		return
	}

	results := make([]bulkItemResult, 0, len(req.SheetNames))
	for _, sheetName := range req.SheetNames {
		var sheetModel models.Sheet
		sheet, err := sheetModel.FindSheetBySafeName(server.DB, sheetName)
		if err != nil {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "sheet not found"})
			continue
		}
		sheet.AppendInstrument(server.DB, req.InstrumentValue)
		results = append(results, bulkItemResult{SheetName: sheetName, Success: true})
	}

	respondBulk(c, results)
}

/*
Remove one instrument from many sheets at once.
POST /api/instrument/bulk/delete
Body (JSON): { "sheet_names": [...], "instrument_value": "Piano" }
*/
func (server *Server) BulkDeleteInstrument(c *gin.Context) {
	if !requireAuth(c) {
		return
	}

	var req forms.BulkInstrumentRequest
	if !bindBulkJSON(c, &req) {
		return
	}
	if req.InstrumentValue == "" {
		utils.DoError(c, http.StatusBadRequest, errNoInstrumentValue)
		return
	}
	if len(req.SheetNames) == 0 {
		utils.DoError(c, http.StatusBadRequest, errNoSheetNames)
		return
	}

	results := make([]bulkItemResult, 0, len(req.SheetNames))
	for _, sheetName := range req.SheetNames {
		var sheetModel models.Sheet
		sheet, err := sheetModel.FindSheetBySafeName(server.DB, sheetName)
		if err != nil {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "sheet not found"})
			continue
		}
		if !sheet.DeleteInstrument(server.DB, req.InstrumentValue) {
			results = append(results, bulkItemResult{SheetName: sheetName, Success: false, Error: "instrument not found on sheet"})
			continue
		}
		results = append(results, bulkItemResult{SheetName: sheetName, Success: true})
	}

	respondBulk(c, results)
}
