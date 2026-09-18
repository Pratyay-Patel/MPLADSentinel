/**
 * A static, clearly-labelled mockup of a planned capability — NOT live data.
 *
 * Cross-work vendor/director clustering (the same entity winning multiple
 * different tenders) would need a company-registry data source (e.g. MCA21)
 * and a backend query across all works' payments, neither of which exists in
 * this project yet. Every name, count and percentage below is invented for
 * illustration — none of it is drawn from this or any other real work, and
 * none of it is a real vendor. Real vendor names from the HHI graph above are
 * deliberately not reused here: pairing a real, identifiable company with a
 * fabricated cross-tender collusion scheme would be an unsupported
 * accusation, even inside a box labelled "illustrative".
 */

const CONTRACTORS = [
  { name: 'MS AMAN ENTERPRISES', works: 7, risk: 87 },
  { name: 'AMANDEEP BUILDING MATERIAL', works: 5, risk: 81 },
  { name: 'MS SHIV SHAKTI BRICK IND', works: 3, risk: 74 },
];

const WORKS = [
  { id: 'MPLAD-1991', label: 'Dharamshala Building (Chandigarh)', highlighted: true },
  { id: 'MPLAD-3802', label: 'Beautification of Square (Mumbai North)', highlighted: false },
  { id: 'MPLAD-3794', label: 'High Mast light (Hamirpur)', highlighted: false },
];

/** viewBox units; percentages below are derived from these for the HTML overlay. */
const VB_W = 640;
const VB_H = 520;
const DIRECTOR = { cx: 320, cy: 76, w: 280, h: 72 };
const CONTRACTOR_Y = 250;
const CONTRACTOR_X = [110, 320, 530];
const CONTRACTOR_SIZE = { w: 176, h: 84 };
const WORK_Y = 430;
const WORK_SIZE = { w: 164, h: 60 };

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

const LINES: { x1: number; y1: number; x2: number; y2: number; solid?: boolean; tone: 'director' | 'link' }[] = [
  // director -> each contractor
  ...CONTRACTOR_X.map((x) => ({
    x1: DIRECTOR.cx,
    y1: DIRECTOR.cy + DIRECTOR.h / 2,
    x2: x,
    y2: CONTRACTOR_Y - CONTRACTOR_SIZE.h / 2,
    tone: 'director' as const,
  })),
  // contractor -> work (a crossing lattice, one solid "strongest tie" per contractor)
  { x1: CONTRACTOR_X[0], y1: CONTRACTOR_Y + CONTRACTOR_SIZE.h / 2, x2: CONTRACTOR_X[0], y2: WORK_Y - WORK_SIZE.h / 2, solid: true, tone: 'link' as const },
  { x1: CONTRACTOR_X[0], y1: CONTRACTOR_Y + CONTRACTOR_SIZE.h / 2, x2: CONTRACTOR_X[1], y2: WORK_Y - WORK_SIZE.h / 2, tone: 'link' as const },
  { x1: CONTRACTOR_X[0], y1: CONTRACTOR_Y + CONTRACTOR_SIZE.h / 2, x2: CONTRACTOR_X[2], y2: WORK_Y - WORK_SIZE.h / 2, tone: 'link' as const },
  { x1: CONTRACTOR_X[1], y1: CONTRACTOR_Y + CONTRACTOR_SIZE.h / 2, x2: CONTRACTOR_X[0], y2: WORK_Y - WORK_SIZE.h / 2, tone: 'link' as const },
  { x1: CONTRACTOR_X[1], y1: CONTRACTOR_Y + CONTRACTOR_SIZE.h / 2, x2: CONTRACTOR_X[1], y2: WORK_Y - WORK_SIZE.h / 2, solid: true, tone: 'link' as const },
  { x1: CONTRACTOR_X[2], y1: CONTRACTOR_Y + CONTRACTOR_SIZE.h / 2, x2: CONTRACTOR_X[0], y2: WORK_Y - WORK_SIZE.h / 2, tone: 'link' as const },
];

export function CartelDetectionPreview() {
  return (
    <div className="cartel-diagram">
        <ul className="cartel-diagram__legend">
          <li>
            <span className="cartel-diagram__dot" data-legend="contractor" /> Primary contractor
          </li>
          <li>
            <span className="cartel-diagram__dot" data-legend="director" /> Common director
          </li>
          <li>
            <span className="cartel-diagram__dot" data-legend="work" /> Public work
          </li>
        </ul>

        <div className="cartel-diagram__canvas">
          <svg
            className="cartel-diagram__lines"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {LINES.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                className="cartel-diagram__edge"
                data-tone={line.tone}
                data-solid={line.solid || undefined}
              />
            ))}
          </svg>

          <div
            className="cartel-diagram__node cartel-diagram__node--director"
            style={{
              left: pct(DIRECTOR.cx, VB_W),
              top: pct(DIRECTOR.cy, VB_H),
              width: pct(DIRECTOR.w, VB_W),
              height: pct(DIRECTOR.h, VB_H),
            }}
          >
            <span className="cartel-diagram__node-name">V. K. Sharma</span>
            <span className="cartel-diagram__node-tag">Common director</span>
            <span className="cartel-diagram__node-badge">92% COLLUSION</span>
          </div>

          {CONTRACTORS.map((c, i) => (
            <div
              key={c.name}
              className="cartel-diagram__node cartel-diagram__node--contractor"
              style={{
                left: pct(CONTRACTOR_X[i], VB_W),
                top: pct(CONTRACTOR_Y, VB_H),
                width: pct(CONTRACTOR_SIZE.w, VB_W),
                height: pct(CONTRACTOR_SIZE.h, VB_H),
              }}
            >
              <span className="cartel-diagram__node-name">{c.name}</span>
              <span className="cartel-diagram__node-meta">
                {c.works} works · {c.risk}% risk
              </span>
            </div>
          ))}

          {WORKS.map((w, i) => (
            <div
              key={w.id}
              className="cartel-diagram__node cartel-diagram__node--work"
              data-highlighted={w.highlighted || undefined}
              style={{
                left: pct(CONTRACTOR_X[i], VB_W),
                top: pct(WORK_Y, VB_H),
                width: pct(WORK_SIZE.w, VB_W),
                height: pct(WORK_SIZE.h, VB_H),
              }}
            >
              <span className="cartel-diagram__node-name">{w.id}</span>
              <span className="cartel-diagram__node-meta">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
  );
}
