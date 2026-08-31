package controllers

import (
	"net/http"
	"strconv"

	"github.com/SheetAble/SheetAble/backend/api/forms"
	"github.com/SheetAble/SheetAble/backend/api/models"
	"github.com/SheetAble/SheetAble/backend/api/utils"
	"github.com/gin-gonic/gin"
)

/*
Get the saved annotation strokes for one page of a sheet. No annotations
yet on that page returns an empty strokes array, not a 404 - "nothing
drawn here" isn't an error condition for the viewer.

GET /api/sheet/:sheetName/annotations/:pageNumber
*/
func (server *Server) GetPageAnnotation(c *gin.Context) {
	sheetName := c.Param("sheetName")
	pageNumber, err := strconv.Atoi(c.Param("pageNumber"))
	if err != nil {
		utils.DoError(c, http.StatusBadRequest, err)
		return
	}

	strokes, err := models.GetPageAnnotation(server.DB, sheetName, pageNumber)
	if err != nil {
		utils.DoError(c, http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"strokes": strokes})
}

/*
Save (replace) the annotation strokes for one page of a sheet. Shared
across everyone who views the sheet - not per-user - and requires auth
like every other write endpoint.

PUT /api/sheet/:sheetName/annotations/:pageNumber
Body (JSON): { "strokes": [...] }
*/
func (server *Server) SavePageAnnotation(c *gin.Context) {
	sheetName := c.Param("sheetName")
	pageNumber, err := strconv.Atoi(c.Param("pageNumber"))
	if err != nil {
		utils.DoError(c, http.StatusBadRequest, err)
		return
	}

	var req forms.SaveAnnotationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.DoError(c, http.StatusBadRequest, err)
		return
	}

	if err := models.SavePageAnnotation(server.DB, sheetName, pageNumber, req.Strokes); err != nil {
		utils.DoError(c, http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"saved": true})
}
