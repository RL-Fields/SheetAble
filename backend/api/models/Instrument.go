package models

import (
	"errors"
	"strings"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/kennygrant/sanitize"
)

// Instrument is the master list of instruments a sheet can be tagged with.
// It backs the checkbox list on a sheet's edit modal, the bulk-editor
// dropdown, and the Instruments browse tab - kept as its own small table
// (rather than a hardcoded frontend list) so the list can be grown or
// trimmed from the UI.
type Instrument struct {
	SafeName  string    `gorm:"primary_key" json:"safe_name"`
	Name      string    `json:"name"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
}

func (i *Instrument) Prepare() {
	i.Name = strings.TrimSpace(i.Name)
	i.SafeName = sanitize.Name(i.Name)
}

// SaveInstrument adds a new instrument to the master list. Re-adding one
// that's already there is treated as a success (returns the existing row)
// rather than an error, so it isn't a foot-gun to click "add" twice.
func (i *Instrument) SaveInstrument(db *gorm.DB) (*Instrument, error) {
	i.Prepare()
	if i.Name == "" {
		return &Instrument{}, errors.New("instrument name is required")
	}

	existing := &Instrument{}
	if err := db.Where("safe_name = ?", i.SafeName).Take(existing).Error; err == nil {
		return existing, nil
	}

	if err := db.Create(i).Error; err != nil {
		return &Instrument{}, err
	}
	return i, nil
}

// DeleteInstrument removes an instrument from the master list only - it
// deliberately leaves any sheet that already has this instrument set
// untouched, the same way deleting a tag doesn't rewrite history. It just
// stops the instrument being offered/browsable going forward.
func (i *Instrument) DeleteInstrument(db *gorm.DB, safeName string) error {
	result := db.Where("safe_name = ?", safeName).Delete(&Instrument{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("instrument not found")
	}
	return nil
}

func GetAllInstruments(db *gorm.DB) ([]*Instrument, error) {
	var instruments []*Instrument
	err := db.Order("name asc").Find(&instruments).Error
	if err != nil {
		return []*Instrument{}, err
	}
	return instruments, nil
}

// SeedDefaultInstruments populates the master list the first time the app
// runs against a fresh database, so existing behaviour (and existing sheets'
// instrument values) doesn't regress. It only runs when the table is
// completely empty, so deliberately deleting every instrument later is
// respected rather than being re-seeded on the next restart.
func SeedDefaultInstruments(db *gorm.DB) {
	var count int
	db.Model(&Instrument{}).Count(&count)
	if count > 0 {
		return
	}

	defaults := []string{
		"Piano", "Guitar", "Violin", "Voice", "Flute", "Cello", "Clarinet",
		"Trumpet", "Saxophone", "Drums", "Bass Guitar", "Kalimba", "Other",
	}
	for _, name := range defaults {
		instrument := &Instrument{Name: name}
		instrument.SaveInstrument(db)
	}
}
