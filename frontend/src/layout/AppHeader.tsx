import { Link } from 'react-router-dom';

import { resolveDataSource } from '../data';
import { CloseIcon, MenuIcon, SidebarIcon } from '../ui/icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PersonaSwitcher } from './PersonaSwitcher';
import { UserMenu } from './UserMenu';
import { VoiceCommand } from './VoiceCommand';

/**
 * Scale of the ingested MPLADS dataset (Empowered Indian public API — see
 * docs/data-source.md). Shown in the header so the small demo slice is not
 * mistaken for the whole system. Update if the ingest total changes.
 */
const DATASET_SCALE = '6,044 works · 34 states/UTs';

function DatasetStatus() {
  const live = resolveDataSource() === 'api';
  return (
    <span
      className="app-header__dataset"
      data-live={live || undefined}
      title={
        live
          ? 'Connected to the live MPLADS dataset via the portal API.'
          : `Illustrative demo slice. The full ingested dataset covers ${DATASET_SCALE}.`
      }
    >
      <span className="app-header__dataset-dot" aria-hidden />
      {live ? 'Live data' : 'Demo data'}
      <span className="app-header__dataset-scale">· full dataset {DATASET_SCALE}</span>
    </span>
  );
}

export interface AppHeaderProps {
  /** Whether the mobile nav drawer is open. */
  navOpen: boolean;
  onToggleNav: () => void;
  /** id of the sidebar element the toggle controls. */
  navId: string;
  /** Desktop icon-rail state + toggle. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AppHeader({
  navOpen,
  onToggleNav,
  navId,
  collapsed,
  onToggleCollapsed,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="app-menu-toggle"
        aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={navOpen}
        aria-controls={navId}
        onClick={onToggleNav}
      >
        {navOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <button
        type="button"
        className="app-collapse-toggle"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
        aria-controls={navId}
        onClick={onToggleCollapsed}
      >
        <SidebarIcon />
      </button>

      <Link to="/" className="app-brand" style={{ color: 'inherit', textDecoration: 'none' }}>
        <span className="app-brand__name">MPLADSentinel</span>
        <span className="app-brand__tagline">MPLADS monitoring &amp; transparency</span>
      </Link>

      <DatasetStatus />

      <div className="app-header__spacer" />

      <VoiceCommand />
      <LanguageSwitcher />
      <PersonaSwitcher />

      <div className="app-header__user">
        <UserMenu />
      </div>
    </header>
  );
}
