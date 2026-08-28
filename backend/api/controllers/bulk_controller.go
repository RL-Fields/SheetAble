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

	"github.com/SheetAble/SheetAble/backend/api/auth"
	. "github.com/SheetAble/SheetAble/backend/api/config"
	"github.com/SheetAble/SheetAble/backend/api/forms"
	"github.com/SheetAble/SheetAble/backend/api/models"
	"github.com/SheetAble/SheetAble/backend/api/utils"
	"github.com/gin-gonic/gin"
)

var (
	errNoSheetNames = errors.New("no sheet_names given")
	errNoTagValue   = errors.New("no tag_value given")
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
