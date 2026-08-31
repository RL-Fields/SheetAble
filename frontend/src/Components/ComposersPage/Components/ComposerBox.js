import React from "react";

import { useHistory } from "react-router-dom";

// A row in the Composers table. Used to be a card with a portrait thumbnail,
// but with potentially many composers (band names, movie soundtracks, etc,
// not just classical composers) a horizontally-scrolling row of cards made
// it impossible to see everything at once, and some Wikipedia portraits
// don't crop cleanly into a small square. A plain table scrolls normally
// and doesn't have either problem - the portrait is still shown on each
// composer's own page.
function ComposerBox({ composer }) {
  let history = useHistory();

  return (
    <tr
      key={composer.name}
      className="composer-row"
      onClick={() => history.push(`/composer/${composer.safe_name}`)}
    >
      <td className="composer-row-name">{composer.name}</td>
      <td className="composer-row-epoch">{composer.epoch}</td>
    </tr>
  );
}

export default ComposerBox;
