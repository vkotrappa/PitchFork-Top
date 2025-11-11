import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Sector {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  display_order: number;
}

interface SectorTreeProps {
  selectedSectors: Array<{sector: string, sub_sector: string}>;
  onChange: (selected: Array<{sector: string, sub_sector: string}>) => void;
  isDark: boolean;
  multiSelect?: boolean;
}

const SectorTree: React.FC<SectorTreeProps> = ({ 
  selectedSectors, 
  onChange, 
  isDark
}) => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Load sectors from database
  useEffect(() => {
    const loadSectors = async () => {
      try {
        const { data, error } = await supabase
          .from('sectors')
          .select('*')
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error loading sectors:', error);
          return;
        }

        if (data) {
          setSectors(data);
          
          // Expand all sectors by default
          const topLevelSectors = data.filter(s => s.level === 1);
          setExpandedSectors(new Set(topLevelSectors.map(s => s.id)));
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    loadSectors();
  }, []);

  // Build tree structure
  const buildTree = () => {
    const topLevelSectors = sectors.filter(s => s.level === 1);
    return topLevelSectors.map(sector => ({
      ...sector,
      children: sectors.filter(s => s.parent_id === sector.id)
    }));
  };

  const toggleExpand = (sectorId: string) => {
    setExpandedSectors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectorId)) {
        newSet.delete(sectorId);
      } else {
        newSet.add(sectorId);
      }
      return newSet;
    });
  };

  const isSectorSelected = (sectorName: string, subSectorName?: string) => {
    if (subSectorName) {
      return selectedSectors.some(
        s => s.sector === sectorName && s.sub_sector === subSectorName
      );
    } else {
      // Check if any sub-sector of this sector is selected
      return selectedSectors.some(s => s.sector === sectorName);
    }
  };

  const toggleSectorSelection = (sectorName: string, subSectorName?: string) => {
    if (subSectorName) {
      // Toggle sub-sector
      const isSelected = isSectorSelected(sectorName, subSectorName);
      if (isSelected) {
        onChange(selectedSectors.filter(
          s => !(s.sector === sectorName && s.sub_sector === subSectorName)
        ));
      } else {
        onChange([...selectedSectors, { sector: sectorName, sub_sector: subSectorName }]);
      }
    } else {
      // Toggle all sub-sectors of this sector
      const sector = sectors.find(s => s.name === sectorName && s.level === 1);
      if (!sector) return;

      const subSectors = sectors.filter(s => s.parent_id === sector.id);
      const allSelected = subSectors.every(sub => 
        isSectorSelected(sectorName, sub.name)
      );

      if (allSelected) {
        // Deselect all sub-sectors
        onChange(selectedSectors.filter(s => s.sector !== sectorName));
      } else {
        // Select all sub-sectors
        const newSelections = subSectors.map(sub => ({
          sector: sectorName,
          sub_sector: sub.name
        }));
        const existing = selectedSectors.filter(s => s.sector !== sectorName);
        onChange([...existing, ...newSelections]);
      }
    }
  };

  const filteredTree = () => {
    const tree = buildTree();
    if (!searchQuery.trim()) return tree;

    const query = searchQuery.toLowerCase();
    return tree.filter(sector => {
      const sectorMatches = sector.name.toLowerCase().includes(query);
      const subSectorMatches = sector.children.some(
        child => child.name.toLowerCase().includes(query)
      );
      return sectorMatches || subSectorMatches;
    }).map(sector => ({
      ...sector,
      children: searchQuery.trim() 
        ? sector.children.filter(child => 
            child.name.toLowerCase().includes(query) ||
            sector.name.toLowerCase().includes(query)
          )
        : sector.children
    }));
  };

  const tree = filteredTree();

  const SectorCheckbox: React.FC<{
    sector: Sector & { children: Sector[] };
    someSelected: boolean;
    allSelected: boolean;
  }> = ({ sector, someSelected, allSelected }) => {
    const checkboxRef = React.useRef<HTMLInputElement>(null);
    
    React.useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = someSelected && !allSelected;
      }
    }, [someSelected, allSelected]);

    return (
      <input
        type="checkbox"
        ref={checkboxRef}
        checked={allSelected}
        onChange={() => toggleSectorSelection(sector.name)}
        className={`mr-1.5 w-3 h-3 ${
          isDark ? 'text-blue-500' : 'text-blue-600'
        } focus:ring-blue-500`}
      />
    );
  };

  const renderSector = (sector: Sector & { children: Sector[] }) => {
    const isExpanded = expandedSectors.has(sector.id);
    const hasChildren = sector.children.length > 0;
    const someSelected = sector.children.some(child => 
      isSectorSelected(sector.name, child.name)
    );
    const allSelected = sector.children.length > 0 && 
      sector.children.every(child => isSectorSelected(sector.name, child.name));

    return (
      <div key={sector.id} className="mb-0.5">
        <div className={`flex items-center py-0.5 px-1.5 rounded ${
          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}>
          {hasChildren && (
            <button
              onClick={() => toggleExpand(sector.id)}
              className={`mr-1.5 p-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <div className="flex items-center flex-1">
            <SectorCheckbox 
              sector={sector}
              someSelected={someSelected}
              allSelected={allSelected}
            />
            <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'} font-medium`}>
              {sector.name}
            </span>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="ml-5 mt-0.5">
            {sector.children.map(child => (
              <div
                key={child.id}
                className={`flex items-center py-0.5 px-1.5 rounded ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSectorSelected(sector.name, child.name)}
                  onChange={() => toggleSectorSelection(sector.name, child.name)}
                  className={`mr-1.5 w-3 h-3 ${
                    isDark ? 'text-blue-500' : 'text-blue-600'
                  } focus:ring-blue-500`}
                />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {child.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search sectors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full max-w-md px-3 py-1.5 text-sm rounded-lg border ${
            isDark
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
      </div>

      {/* Tree */}
      <div className={`w-full max-h-96 overflow-y-auto border rounded-lg p-3 ${
        isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
      }`}>
        {tree.length === 0 ? (
          <div className={`text-center py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No sectors found
          </div>
        ) : (
          tree.map(renderSector)
        )}
      </div>
    </div>
  );
};

export default SectorTree;

