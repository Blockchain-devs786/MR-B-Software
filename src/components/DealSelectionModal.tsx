import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useToast } from './Toast';

interface DealSelectionModalProps {
    deal: any;
    allItems: any[];
    onClose: () => void;
    onAddToOrder: (dealItem: any) => void;
}

const DealSelectionModal = ({ deal, allItems, onClose, onAddToOrder }: DealSelectionModalProps) => {
    // selections maps category index to an array of selected item IDs
    const [selections, setSelections] = useState<Record<number, number[]>>({});
    const { showToast } = useToast();

    const handleSelect = (catIdx: number, itemId: number, maxQuantity: number) => {
        setSelections(prev => {
            const catSelections = prev[catIdx] || [];
            if (catSelections.length < maxQuantity) {
                return { ...prev, [catIdx]: [...catSelections, itemId] };
            } else {
                showToast(`You can only select ${maxQuantity} item(s) for this category`);
                return prev;
            }
        });
    };

    const handleRemove = (catIdx: number, itemId: number) => {
        setSelections(prev => {
            const catSelections = prev[catIdx] || [];
            const index = catSelections.indexOf(itemId);
            if (index > -1) {
                const newSelections = [...catSelections];
                newSelections.splice(index, 1);
                return { ...prev, [catIdx]: newSelections };
            }
            return prev;
        });
    };

    const handleAddToCart = () => {
        // Validation
        const missingSelections = deal.categories.findIndex((cat: any, idx: number) => 
            (selections[idx] || []).length !== cat.quantity
        );

        if (missingSelections !== -1) {
            const cat = deal.categories[missingSelections];
            showToast(`Please select exactly ${cat.quantity} option(s) for ${cat.name}`);
            return;
        }

        // Build note string describing the deal selections and calc total price
        let noteParts: string[] = [];
        let sumSelectedItemsPrice: number = 0;

        deal.categories.forEach((cat: any, idx: number) => {
            const selectedItemIds = selections[idx] || [];
            const selectedItemNames = selectedItemIds.map(id => {
                const item = allItems.find(i => i.id === id);
                if (item) {
                    sumSelectedItemsPrice += Number(item.price || 0);
                    return item.name;
                }
                return 'Unknown';
            });
            noteParts.push(`${cat.name}: ${selectedItemNames.join(', ')}`);
        });

        const note = noteParts.join(' | ');
        const discountAmount = sumSelectedItemsPrice * (Number(deal.discount || 0) / 100);
        const finalDealPrice = Math.max(0, sumSelectedItemsPrice - discountAmount);

        const dealItemForCart = {
            id: `deal_${deal.id}_${Date.now()}`, // unique ID for cart so multiple deals can exist
            name: `Combo Deal: ${deal.name}`,
            unit_price: finalDealPrice,
            quantity: 1,
            discount: 0,
            note: note,
            isDeal: true,
            originalDealId: deal.id
        };

        onAddToOrder(dealItemForCart);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {deal.name}
                            <span className="ml-2 text-sm text-gray-400">#{deal.id}</span>
                        </h2>
                        <p className="text-orange-600 font-bold text-sm bg-orange-50 inline-block px-2 py-0.5 rounded mt-1">
                            Combo Deal Discount: {Number(deal.discount || 0).toFixed(0)}%
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {deal.categories.map((cat: any, catIdx: number) => {
                        const selectedCount = (selections[catIdx] || []).length;
                        const isComplete = selectedCount === cat.quantity;

                        return (
                            <div key={cat.id || catIdx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-orange-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900">{cat.name}</h3>
                                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${isComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        Choose {cat.quantity} ({selectedCount}/{cat.quantity}) {isComplete && <Check size={14} className="inline ml-1 mb-0.5" />}
                                    </span>
                                </div>
                                <div className="p-2 grid grid-cols-2 gap-2 bg-white">
                                    {cat.items.map((catItemObj: any) => {
                                        // The backend returns an array of deal_category_items which possess item_id
                                        const itemId = catItemObj.item_id;
                                        const item = allItems.find(i => i.id === itemId);
                                        if (!item) return null;

                                        const count = (selections[catIdx] || []).filter(id => id === itemId).length;
                                        const isSelected = count > 0;

                                        return (
                                            <div
                                                key={itemId}
                                                className={`p-3 rounded-lg border-2 transition-all flex justify-between items-center ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                <span className={`font-semibold text-sm ${isSelected ? 'text-orange-700' : 'text-gray-800'}`}>{item.name}</span>
                                                {isSelected ? (
                                                    <div className="flex items-center bg-white rounded-md shadow-sm border border-orange-200 overflow-hidden">
                                                        <button onClick={() => handleRemove(catIdx, itemId)} className="w-7 h-7 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-100 transition-colors">-</button>
                                                        <span className="text-xs font-bold w-4 text-center text-orange-700">{count}</span>
                                                        <button onClick={() => handleSelect(catIdx, itemId, cat.quantity)} className="w-7 h-7 flex items-center justify-center text-orange-600 font-bold hover:bg-orange-100 transition-colors">+</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleSelect(catIdx, itemId, cat.quantity)} className="text-xs font-bold text-gray-500 hover:text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-md transition-colors border border-gray-200 hover:border-orange-300 tracking-wide uppercase bg-white">Add</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                    <button
                        onClick={handleAddToCart}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold uppercase tracking-wider shadow-md transition-colors shadow-orange-200"
                    >
                        Add Deal to Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DealSelectionModal;
