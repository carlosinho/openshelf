/**
 * KarolFooter Component - Version 1.1
 * My standard footer that links to my stuff
 * Customizable a bit
 */

export interface FooterLink {
  label: string;
  url: string;
  icon?: React.ReactNode;
}

export interface KarolFooterProps {
  authorName?: string;
  authorUrl?: string;
  accentColor?: string;
  links?: FooterLink[];
  showCopyright?: boolean;
  version?: string;
  className?: string;
}

export const KarolFooter = ({
  authorName = "Karol K",
  authorUrl = "https://karol.cc/",
  accentColor = "#166534",
  showCopyright = true,
  version,
  className = "",
  links = [
    {
      label: "WP Workshop",
      url: "https://wpwork.shop/",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      )
    },
    {
      label: "YouTube",
      url: "https://www.youtube.com/@wpworkshophq",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    }
  ]
}: KarolFooterProps) => {
  return (
    <footer className={`border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-16 ${className}`}>
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          {showCopyright && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {version && (
                <>
                  <span>{version}</span>
                </>
              )}
              <span>© {new Date().getFullYear()}</span>
              <a 
                href={authorUrl}
                target="_blank" 
                rel="noopener"
                className="text-gray-600 font-medium transition-colors"
                style={{ 
                  color: 'inherit',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = accentColor}
                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
              >
                {authorName}
              </a> 
              <a 
                href="https://x.com/iamkarolk"
                target="_blank" 
                rel="noopener"
                className="text-gray-600 font-medium transition-colors"
                style={{ 
                  color: 'inherit',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = accentColor}
                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
              >
                (Twitter/X)
              </a>
            </div>
          )}
          
          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            {links.map((link, index) => (
              <a 
                key={index}
                href={link.url}
                target="_blank" 
                rel="noopener"
                className="flex items-center gap-2 text-gray-600 font-medium transition-colors"
                style={{ 
                  color: 'inherit',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = accentColor}
                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
              >
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}; 