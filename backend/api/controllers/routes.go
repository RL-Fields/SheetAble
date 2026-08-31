package controllers

import (
	"net/http"
	"path"
	"time"

	"github.com/SheetAble/SheetAble/backend/api/middlewares"
	"github.com/gin-gonic/gin"

	rice "github.com/GeertJohan/go.rice"
)

func (server *Server) SetupRouter() {
	r := gin.New()
	r.Use(gin.Recovery())

	// Health checks
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "OK"})
	})

	api := r.Group("/api")

	api.GET("", server.Home)
	api.GET("/version", server.Version)
	// SecureApi is still rooted at /api/... but it has the auth middleware so it'server routes check token on each call
	secureApi := api.Group("")
	secureApi.Use(middlewares.AuthMiddleware())

	// Login routes
	api.POST("/login", server.Login)

	// Users routes
	api.POST("/users", server.CreateUser)
	secureApi.GET("/users", server.GetUsers)
	secureApi.GET("/users/:id", server.GetUser)
	secureApi.PUT("/users/:id", server.UpdateUser)
	secureApi.DELETE("/users/:id", server.DeleteUser)
	api.POST("/reset_password", server.ResetPassword)
	api.POST("/request_password_reset", server.RequestPasswordReset)

	// Sheet routes
	secureApi.POST("/upload", server.UploadFile)
	secureApi.POST("/bulk-upload", server.BulkUploadFile)
	secureApi.POST("/sheets/bulk-delete", server.BulkDeleteSheets)
	secureApi.DELETE("/sheets/bulk", server.BulkDeleteSheets)
	secureApi.GET("/sheets", server.GetSheetsPage)
	secureApi.POST("/sheets", server.GetSheetsPage)
	api.GET("/sheet/thumbnail/:name", server.GetThumbnail)
	secureApi.GET("/sheet/pdf/:composer/:sheetName", server.GetPDF)
	secureApi.GET("/sheet/:sheetName", server.GetSheet)
	secureApi.PUT("/sheet/:sheetName", server.UpdateSheet)
	secureApi.DELETE("/sheet/:sheetName", server.DeleteSheet)
	secureApi.GET("/search/:searchValue", server.SearchSheets)
	secureApi.GET("/search/composers/:searchValue", server.SearchComposers)
	secureApi.PUT("/sheet/:sheetName/info", server.UpdateSheetInformationText)
	secureApi.POST("/sheet/:sheetName/info", server.UpdateSheetInformationText)
	secureApi.POST("/sheet/:sheetName/youtube", server.UpdateSheetYoutubeUrl)

	// Sheet annotation routes (shared freehand markup, one set of strokes
	// per sheet page - not per-user)
	secureApi.GET("/sheet/:sheetName/annotations/:pageNumber", server.GetPageAnnotation)
	secureApi.PUT("/sheet/:sheetName/annotations/:pageNumber", server.SavePageAnnotation)

	// Sheet tag routes
	secureApi.DELETE("/tag/sheet/:sheetName", server.DeleteTag)
	secureApi.POST("/tag/delete/sheet/:sheetName", server.DeleteTag)
	secureApi.POST("/tag/sheet/:sheetName", server.AppendTag)
	secureApi.GET("/tag/sheet/:sheetName", server.AppendTag)
	secureApi.GET("/tag", server.FindSheetsByTag)
	secureApi.POST("/tag", server.FindSheetsByTag)
	secureApi.POST("/tag/bulk", server.BulkAppendTag)
	secureApi.POST("/tag/bulk/delete", server.BulkDeleteTag)
	secureApi.DELETE("/tag/bulk", server.BulkDeleteTag)

	// Sheet instrument routes (a sheet can carry more than one, drawn from
	// the master list below - same shape as tags but kept separate)
	secureApi.POST("/instrument/sheet/:sheetName", server.AppendInstrument)
	secureApi.POST("/instrument/delete/sheet/:sheetName", server.DeleteInstrument)
	secureApi.POST("/instrument", server.FindSheetsByInstrument)

	// Master instrument list (add/remove instruments from the list itself,
	// as opposed to tagging one sheet with an existing instrument above)
	secureApi.GET("/instruments/list", server.GetInstrumentsList)
	secureApi.POST("/instruments/list", server.AddInstrumentToList)
	secureApi.POST("/instruments/list/delete", server.DeleteInstrumentFromList)

	// Bulk composer/instrument routes (Manage Sheets page)
	secureApi.POST("/composer/bulk", server.BulkSetComposer)
	secureApi.POST("/instrument/bulk", server.BulkAddInstrument)
	secureApi.POST("/instrument/bulk/delete", server.BulkDeleteInstrument)
	secureApi.POST("/composers/backfill-portraits", server.BackfillComposerPortraits)

	// Composer routes
	secureApi.GET("/composers", server.GetComposersPage)
	secureApi.POST("/composers", server.GetComposersPage)
	secureApi.PUT("/composer/:composerName", server.UpdateComposer)
	secureApi.DELETE("/composer/:composerName", server.DeleteComposer)
	api.GET("/composer/portrait/:composerName", server.ServePortraits)

	// Serve React
	appBox := rice.MustFindBox("../../../frontend/build")

	// r.StaticFS("/static", appBox.HTTPBox())
	r.GET("/static/*filepath", func(c *gin.Context) {
		filepath := c.Request.URL.String()
		file, err := appBox.Open(filepath)
		if err != nil {
			c.String(http.StatusBadRequest, err.Error())
			return
		}

		http.ServeContent(c.Writer, c.Request, path.Base(filepath), time.Time{}, file)

	})
	r.NoRoute(gin.WrapF(serveAppHandler(appBox)))

	server.Router = r
}

func serveAppHandler(app *rice.Box) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		indexFile, err := app.Open("index.html")
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		http.ServeContent(w, r, "index.html", time.Time{}, indexFile)
	}
}
