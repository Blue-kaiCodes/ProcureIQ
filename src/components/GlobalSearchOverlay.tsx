import React from "react";
import { PurchaseRequest, Supplier, InventoryItem } from "../types";
import { FileText, Truck, Package, Building, ShoppingBag, Folder } from "lucide-react";

interface GlobalSearchOverlayProps {
  query: string;
  requests: PurchaseRequest[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onSelectRequest: (req: PurchaseRequest) => void;
  onSelectSupplier: (supId: string) => void;
  onSelectTab: (tab: any) => void;
  onClear: () => void;
}

export default function GlobalSearchOverlay({
  query,
  requests,
  suppliers,
  inventory,
  onSelectRequest,
  onSelectSupplier,
  onSelectTab,
  onClear,
}: GlobalSearchOverlayProps) {
  if (!query || query.trim().length < 2) return null;

  const q = query.toLowerCase().trim();

  // Highlight matches function
  const highlightMatch = (text: string) => {
    if (!text) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${q.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === q
            ? <mark key={i} className="bg-amber-100 text-amber-900 font-bold px-0.5 rounded-sm">{part}</mark>
            : part
        )}
      </span>
    );
  };

  const matchedRequests = requests.filter(
    (r) =>
      r.id.toLowerCase().includes(q) ||
      r.itemName.toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
  );

  const matchedSuppliers = suppliers.filter(
    (s) =>
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );

  const matchedInventory = inventory.filter(
    (item) =>
      item.id.toLowerCase().includes(q) ||
      item.itemName.toLowerCase().includes(q) ||
      item.warehouse.toLowerCase().includes(q)
  );

  const hasMatches =
    matchedRequests.length > 0 ||
    matchedSuppliers.length > 0 ||
    matchedInventory.length > 0;

  return (
    <div className="absolute top-[45px] right-4 w-[460px] bg-white border border-gray-300 rounded shadow-lg z-50 overflow-hidden flex flex-col text-xs max-h-[480px]">
      
      {/* Header Info */}
      <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        <span>Instant Enterprise Registry Search</span>
        <button onClick={onClear} className="text-gray-400 hover:text-gray-600 font-sans text-[10px]">Clear</button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-1">
        
        {!hasMatches ? (
          <div className="p-6 text-center text-gray-400 italic">
            No registry matches found for &ldquo;{query}&rdquo;
          </div>
        ) : (
          <>
            {/* Purchase Requests Category */}
            {matchedRequests.length > 0 && (
              <div className="p-2 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 px-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Purchase Requests ({matchedRequests.length})
                </p>
                <div className="space-y-1">
                  {matchedRequests.slice(0, 4).map((req) => (
                    <div
                      key={req.id}
                      onClick={() => {
                        onSelectRequest(req);
                        onSelectTab("requisitions");
                        onClear();
                      }}
                      className="p-1.5 rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 flex items-center gap-1.5">
                          <span className="font-mono text-[#714B67]">{highlightMatch(req.id)}</span>
                          <span className="truncate">{highlightMatch(req.itemName)}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Buyer: {highlightMatch(req.requestedBy)} | Dept: {highlightMatch(req.department)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-gray-950 shrink-0">₹{req.totalAmount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suppliers Category */}
            {matchedSuppliers.length > 0 && (
              <div className="p-2 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 px-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  Supplier Registry ({matchedSuppliers.length})
                </p>
                <div className="space-y-1">
                  {matchedSuppliers.slice(0, 3).map((sup) => (
                    <div
                      key={sup.id}
                      onClick={() => {
                        onSelectSupplier(sup.id);
                        onSelectTab("suppliers");
                        onClear();
                      }}
                      className="p-1.5 rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center text-left"
                    >
                      <div>
                        <p className="font-bold text-gray-800">{highlightMatch(sup.name)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          ID: {highlightMatch(sup.id)} | Status: {sup.status} | Lead Time: {sup.avgLeadTimeDays} days
                        </p>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded-xs font-mono">{sup.qualityRating.toFixed(1)}/5.0</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory Products Category */}
            {matchedInventory.length > 0 && (
              <div className="p-2 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 px-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Warehouse Inventory ({matchedInventory.length})
                </p>
                <div className="space-y-1">
                  {matchedInventory.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectTab("inventory");
                        onClear();
                      }}
                      className="p-1.5 rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center text-left"
                    >
                      <div>
                        <p className="font-bold text-gray-800">{highlightMatch(item.itemName)}</p>
                        <p className="text-[10px] text-gray-400">
                          SKU: <span className="font-mono">{highlightMatch(item.id)}</span> | Location: {highlightMatch(item.warehouse)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-gray-700 shrink-0">{item.quantityInStock} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
      
      {/* Footer Info */}
      <div className="p-2 bg-gray-50 border-t border-gray-200 text-center text-[10px] text-gray-400">
        Press <span className="font-mono bg-white border px-1 rounded shadow-3xs">ESC</span> to dismiss search results
      </div>

    </div>
  );
}
