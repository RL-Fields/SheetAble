package utils

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"strings"

	. "github.com/SheetAble/SheetAble/backend/api/config"
)

// RequestToPdfToImage asks the pdf2png microservice to render the first page
// of the sheet at `path` into a thumbnail PNG named `name`.png.
//
// The service URL comes from Config().Pdf2PngUrl (env PDF2PNG_URL). This used
// to be hardcoded to the upstream project's own hosted instance
// (pdf2png.sheetable.net), which self-hosted deployments generally cannot
// reach/aren't meant to use - that's why thumbnails silently failed to
// generate. Point PDF2PNG_URL at your own pdf2png container instead, e.g.
// http://pdf2png:5000/createthumbnail for the bundled docker-compose setup.
//
// Returns false (and logs) on any failure instead of panicking, so a
// hiccup talking to pdf2png no longer takes down the whole upload request.
func RequestToPdfToImage(filePath string, name string) bool {
	remoteURL := Config().Pdf2PngUrl
	if remoteURL == "" {
		log.Printf("thumbnail generation skipped for %q: PDF2PNG_URL is not configured", name)
		return false
	}

	if err := sendRequest(filePath, name, remoteURL); err != nil {
		log.Printf("thumbnail generation failed for %q via %s: %v", name, remoteURL, err)
		return false
	}
	return true
}

func sendRequest(path string, name string, remoteURL string) error {
	client := &http.Client{
		// Self-signed certs are common for LAN-only reverse proxies in
		// front of a self-hosted pdf2png instance, so we don't hard-fail
		// on those. Plain-http docker-network calls are unaffected.
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("opening %q: %w", path, err)
	}
	defer file.Close()

	values := map[string]io.Reader{
		"file": file,
		"name": strings.NewReader(name),
	}

	return Upload(client, remoteURL, values, name)
}

func Upload(client *http.Client, url string, values map[string]io.Reader, name string) (err error) {
	// Prepare a form that you will submit to that URL.
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	for key, r := range values {
		var fw io.Writer
		if x, ok := r.(io.Closer); ok {
			defer x.Close()
		}
		// Add an image file
		if x, ok := r.(*os.File); ok {
			if fw, err = w.CreateFormFile(key, x.Name()); err != nil {
				return
			}
		} else {
			// Add other fields
			if fw, err = w.CreateFormField(key); err != nil {
				return
			}
		}
		if _, err = io.Copy(fw, r); err != nil {
			return err
		}

	}
	/*
		Don't forget to close the multipart writer.
		If you don't close it, your request will be missing the terminating boundary.
	*/
	w.Close()

	// Now that you have a form, you can submit it to your handler.
	req, err := http.NewRequest("POST", url, &b)
	if err != nil {
		return
	}
	// Don't forget to set the content type, this will contain the boundary.
	req.Header.Set("Content-Type", w.FormDataContentType())

	// Submit the request
	res, err := client.Do(req)
	if err != nil {
		return
	}
	defer res.Body.Close()

	// Check the response
	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("bad status: %s (%s)", res.Status, strings.TrimSpace(string(body)))
	}

	// Save response
	out, err := os.Create(path.Join(Config().ConfigPath, "sheets/thumbnails", name+".png"))
	if err != nil {
		return
	}
	defer out.Close()
	_, err = io.Copy(out, res.Body)

	return
}
