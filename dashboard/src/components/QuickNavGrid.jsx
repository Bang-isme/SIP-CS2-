import { memo } from 'react';
import './QuickNavGrid.css';

function QuickNavGrid({ cards = [], compact = false }) {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  return (
    <section className={`quick-nav-grid${compact ? ' quick-nav-grid--compact' : ''}`} aria-label="Quick navigation">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          className={`quick-nav-card quick-nav-card--${card.key || 'default'}`}
          onClick={card.onClick}
        >
          {compact ? (
            <div className="quick-nav-card__compact-main">
              <div className="quick-nav-card__compact-head">
                <span className="quick-nav-card__eyebrow">{card.eyebrow}</span>
                {card.metric ? <span className="quick-nav-card__metric-chip">{card.metric}</span> : null}
              </div>
              <div className="quick-nav-card__compact-copy">
                <h2 className="quick-nav-card__title">{card.title}</h2>
                {card.summary ? <p className="quick-nav-card__summary">{card.summary}</p> : null}
                {card.hint ? <p className="quick-nav-card__hint">{card.hint}</p> : null}
              </div>
              <div className="quick-nav-card__compact-footer">
                <span className="quick-nav-card__link">{card.actionLabel}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="quick-nav-card__top">
                <span className="quick-nav-card__eyebrow">{card.eyebrow}</span>
                {card.metric ? <div className="quick-nav-card__metric">{card.metric}</div> : null}
                <h2 className="quick-nav-card__title">{card.title}</h2>
                {card.summary ? <p className="quick-nav-card__summary">{card.summary}</p> : null}
              </div>
              <div className="quick-nav-card__stats">
                {card.meta?.map((item) => (
                  <span key={item} className="quick-nav-card__secondary">{item}</span>
                ))}
              </div>
              <span className="quick-nav-card__link">{card.actionLabel}</span>
            </>
          )}
        </button>
      ))}
    </section>
  );
}

export default memo(QuickNavGrid);
