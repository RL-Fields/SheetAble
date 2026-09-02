package models

import (
	"net/http"
	"time"

	"github.com/jinzhu/gorm"

	"github.com/SheetAble/SheetAble/backend/api/config"
)

// Activity tracks the single most-recent authenticated request against the
// app, so an outside tool (a Home Assistant automation, say) can tell
// whether SheetAble is still being used without needing to log in itself.
// Deliberately just one row - this is a personal instance, not a
// multi-user analytics feature.
type Activity struct {
	ID         uint      `gorm:"primary_key" json:"-"`
	LastActive time.Time `json:"last_active"`
}

// activityWebhookClient has a short timeout so a slow/unreachable Home
// Assistant instance can never make a real SheetAble request wait around.
var activityWebhookClient = &http.Client{Timeout: 5 * time.Second}

// TouchActivity records "right now" as the last-active time. Cheap enough
// to call on every authenticated request at this app's scale - errors are
// deliberately ignored, since this is a nice-to-have signal, not something
// that should ever fail a real request.
func TouchActivity(db *gorm.DB) {
	now := time.Now()

	var activity Activity
	if err := db.First(&activity).Error; err != nil {
		db.Create(&Activity{LastActive: now})
	} else {
		activity.LastActive = now
		db.Save(&activity)
	}

	fireActivityWebhook()
}

// fireActivityWebhook pings HAWebhookURL (if one is configured) so an
// outside automation - Home Assistant, say - can hear "SheetAble was just
// used" in real time instead of having to poll GetLastActive. Entirely
// optional (no-op if unset) and fire-and-forget: it runs on its own
// goroutine with a short timeout and never reports failures back to the
// caller, since a notification integration being briefly unreachable
// should never be something a real user-facing request has to wait on or
// can fail because of.
func fireActivityWebhook() {
	url := config.Config().HAWebhookURL
	if url == "" {
		return
	}

	go func() {
		resp, err := activityWebhookClient.Post(url, "application/json", nil)
		if err != nil {
			return
		}
		resp.Body.Close()
	}()
}

func GetActivity(db *gorm.DB) (*Activity, error) {
	var activity Activity
	if err := db.First(&activity).Error; err != nil {
		return &Activity{}, err
	}
	return &activity, nil
}
