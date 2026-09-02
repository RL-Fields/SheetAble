package controllers

import (
	"net/http"

	"github.com/SheetAble/SheetAble/backend/api/models"
	"github.com/SheetAble/SheetAble/backend/api/utils"
	"github.com/gin-gonic/gin"
)

func (server *Server) Home(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": "Welcome To The SheetAble API " + utils.Version})
}

func (server *Server) Version(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": utils.Version})
}

// GetLastActive reports the last time someone actually used the app (any
// authenticated request - browsing, opening a sheet, and so on). Public/
// unauthenticated on purpose: it only reveals "was this used recently",
// nothing about what was viewed, and it's meant to be polled by something
// outside the app itself (e.g. a Home Assistant sensor) without needing to
// hold a login token.
// Example request:
//
//	GET /api/last-active
func (server *Server) GetLastActive(c *gin.Context) {
	activity, err := models.GetActivity(server.DB)
	if err != nil {
		// No authenticated request has ever been made yet (fresh install) -
		// that's a legitimate state, not an error.
		c.JSON(http.StatusOK, gin.H{"last_active": nil})
		return
	}
	c.JSON(http.StatusOK, activity)
}
