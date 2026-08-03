import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/authSlice';
import { LogOut, Coffee, BarChart3, Settings, Calculator, User, Search, Plus, Minus, Trash2, Printer, Clock } from 'lucide-react';
import { addItem, removeItem, clearCart, CartItem } from '../store/cartSlice';
import ClockInModal from './ClockInModal';
import ClockOutModal from './ClockOutModal';

interface Product {
  id: number;
  name: string;
  nameAr: string;
  price: string;
  category: string;
  image: string | null;
}

export default function POSLayout() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const shift = useSelector((state: RootState) => state.auth.shift);
  const cart = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showClockIn, setShowClockIn] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);
  
  useEffect(() => {
    fetch('/api/products', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(data => {
        setProducts(data);
        setLoadingProducts(false);
      });
  }, [token]);

  const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * cart.taxRate;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (!shift || shift.status !== 'ACTIVE') {
      alert(lang === 'en' ? 'You must be clocked in to process transactions.' : 'يجب تسجيل الدخول لبدء المعاملات.');
      return;
    }
    if (cart.items.length === 0) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.items,
          totalAmount: total.toFixed(2),
          taxAmount: tax.toFixed(2),
          paymentMethod: 'CARD'
        })
      });
      if (res.ok) {
        const order = await res.json();
        dispatch(clearCart());
        alert(lang === 'en' ? 'Checkout successful! Order: ' + order.id : 'تم الدفع بنجاح! طلب: ' + order.id);
      }
    } catch (e) {
      console.error(e);
      alert('Checkout failed');
    }
  };

  const handleAddItem = (product: any) => {
    if (!shift || shift.status !== 'ACTIVE') {
      alert(lang === 'en' ? 'You must clock in first.' : 'يجب بدء الوردية أولاً.');
      return;
    }
    dispatch(addItem({
      id: Date.now().toString(),
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: parseFloat(product.price),
      quantity: 1,
      modifiers: {}
    }));
  };

  const isAr = lang === 'ar';
  
  return (
<main className="flex-1 grid grid-cols-1 md:grid-cols-12 p-6 gap-6 overflow-hidden">
          <div className="md:col-span-8 flex flex-col gap-6 min-h-0">
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button className="px-4 py-2 bg-[var(--color-accent)] text-black font-bold rounded text-xs shrink-0">{isAr ? 'قهوة' : 'COFFEE'}</button>
              <button className="px-4 py-2 bg-[var(--color-surface)] text-gray-300 font-medium rounded text-xs border border-[var(--color-border)] shrink-0">{isAr ? 'شاي' : 'TEA'}</button>
              <button className="px-4 py-2 bg-[var(--color-surface)] text-gray-300 font-medium rounded text-xs border border-[var(--color-border)] shrink-0">{isAr ? 'مخبوزات' : 'PASTRY'}</button>
              <button className="px-4 py-2 bg-[var(--color-surface)] text-gray-300 font-medium rounded text-xs border border-[var(--color-border)] shrink-0">{isAr ? 'بُن' : 'BEANS'}</button>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto pr-2 relative">
              {(!shift || shift.status !== 'ACTIVE') && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 rounded-xl flex items-center justify-center flex-col gap-4">
                   <LockIcon className="w-12 h-12 text-gray-400" />
                   <p className="text-gray-300 font-bold">Please clock in to process transactions.</p>
                   <button onClick={() => setShowClockIn(true)} className="px-6 py-2 bg-[var(--color-accent)] text-black font-bold rounded-lg hover:bg-[var(--color-accent-hover)]">Clock In</button>
                </div>
              )}

              {loadingProducts ? (
                 <div className="col-span-full text-center py-12 text-gray-500">Loading menu...</div>
              ) : (
                products.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleAddItem(p)}
                    className="bg-[var(--color-base)] border border-[var(--color-border)] rounded-xl p-3 flex flex-col gap-2 hover:border-[var(--color-accent)] transition-colors cursor-pointer group"
                  >
                    <div className="aspect-square bg-[var(--color-surface)] rounded-lg mb-1 relative overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-base)] to-transparent opacity-40"></div>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Coffee size={32} className="text-gray-600 z-10" />
                      )}
                      <div className="absolute bottom-2 right-2 bg-[var(--color-accent)] text-black text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
                        {p.price} SAR
                      </div>
                    </div>
                    <p className="font-bold text-sm leading-tight">{isAr ? p.nameAr : p.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{isAr ? p.category : p.category}</p>
                  </div>
                ))
              )}
              
              {/* Mock Products if empty */}
              {!loadingProducts && products.length === 0 && (
                <>
                  <MockProduct id={1} name="V60 Ethiopian" nameAr="في ٦٠ اثيوبي" price="22.00" onAdd={handleAddItem} isAr={isAr} />
                  <MockProduct id={2} name="Flat White" nameAr="فلات وايت" price="18.00" onAdd={handleAddItem} isAr={isAr} />
                  <MockProduct id={3} name="Iced Matcha" nameAr="ماتشا مثلج" price="24.00" onAdd={handleAddItem} isAr={isAr} />
                  <MockProduct id={4} name="Cortado" nameAr="كورتادو" price="16.00" onAdd={handleAddItem} isAr={isAr} />
                  <MockProduct id={5} name="Spanish Latte" nameAr="سبانش لاتيه" price="20.00" onAdd={handleAddItem} isAr={isAr} />
                  <MockProduct id={6} name="Americano" nameAr="امريكانو" price="14.00" onAdd={handleAddItem} isAr={isAr} />
                </>
              )}
            </div>

            {/* AI Summary Banner */}
            <div className="bg-[var(--color-base)] border border-[var(--color-border)] rounded-xl p-4 flex gap-4 h-32 shrink-0">
              <div className="flex-1 flex flex-col justify-between">
                <h4 className="text-[10px] uppercase text-[var(--color-accent)] font-bold tracking-widest">{isAr ? 'ملخص الذكاء الاصطناعي للأعمال' : 'AI Business Summary'}</h4>
                <p className="text-sm text-gray-300 leading-snug">
                  {isAr ? 'وقت الذروة يقترب (14:00). توقعات بطلب مرتفع على' : 'Peak hour approaching (14:00). Forecasting high demand for'} <span className="text-white font-bold underline decoration-[var(--color-accent)]">{isAr ? 'فلات وايت' : 'Flat White'}</span>. {isAr ? 'نوصي بطحن 500 جرام من البن.' : 'Recommend pre-grinding 500g of House Blend.'}
                </p>
                <div className="flex gap-4 mt-2">
                  <div className="bg-[var(--color-surface)] px-3 py-1 rounded text-[10px] flex gap-2">
                    <span className="text-gray-500">{isAr ? 'الاحتمالية:' : 'PROBABILITY:'}</span> <span className="text-green-500 font-bold">94.2%</span>
                  </div>
                  <div className="bg-[var(--color-surface)] px-3 py-1 rounded text-[10px] flex gap-2">
                    <span className="text-gray-500">{isAr ? 'الإيرادات المتوقعة:' : 'EST. REVENUE:'}</span> <span className="text-[var(--color-accent)] font-bold">2,450 SAR</span>
                  </div>
                </div>
              </div>
              <div className="w-48 bg-[var(--color-base-dark)] rounded-lg p-2 border border-[var(--color-border)] flex items-center justify-center">
                <div className="flex items-end gap-1.5 h-full pt-4">
                  <div className="w-3 bg-gray-700 h-[20%] rounded-t-sm"></div>
                  <div className="w-3 bg-gray-700 h-[40%] rounded-t-sm"></div>
                  <div className="w-3 bg-gray-700 h-[35%] rounded-t-sm"></div>
                  <div className="w-3 bg-[var(--color-accent)] h-[80%] rounded-t-sm"></div>
                  <div className="w-3 bg-[var(--color-accent)] h-[60%] rounded-t-sm"></div>
                  <div className="w-3 bg-gray-800 h-[10%] rounded-t-sm"></div>
                  <div className="w-3 bg-gray-800 h-[15%] rounded-t-sm"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Section */}
          <div className="md:col-span-4 bg-[var(--color-base)] border border-[var(--color-border)] rounded-2xl flex flex-col overflow-hidden min-h-0 relative">
             {(!shift || shift.status !== 'ACTIVE') && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                   <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Register Closed</p>
                </div>
              )}
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-card)] shrink-0">
              <h3 className="font-bold tracking-tight uppercase text-sm">{isAr ? 'الطلب الحالي' : 'Current Order'}</h3>
              <span className="text-[10px] bg-[var(--color-border)] px-2 py-0.5 rounded text-gray-400">#1429-A</span>
            </div>
            
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
              {cart.items.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-500 opacity-50">
                  <Coffee size={48} className="mb-4" />
                  <p className="text-sm">{isAr ? 'لا توجد عناصر في السلة' : 'No items in cart'}</p>
                </div>
              ) : (
                cart.items.map(item => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold">{isAr ? item.nameAr : item.name}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{Object.keys(item.modifiers).length ? Object.values(item.modifiers).join(', ') : '-'}</p>
                    </div>
                    <div className={isAr ? 'text-left' : 'text-right'}>
                      <p className="text-sm font-bold">{(item.price * item.quantity).toFixed(2)}</p>
                      <div className={`flex items-center ${isAr ? 'justify-start' : 'justify-end'} gap-2 mt-1`}>
                        <button className="w-5 h-5 bg-[var(--color-surface)] text-xs rounded border border-[var(--color-border)] flex items-center justify-center hover:border-gray-500" onClick={() => dispatch(removeItem(item.id))}>-</button>
                        <span className="text-xs font-bold w-3 text-center">{item.quantity}</span>
                        <button className="w-5 h-5 bg-[var(--color-surface)] text-xs rounded border border-[var(--color-border)] flex items-center justify-center hover:border-gray-500" onClick={() => dispatch(addItem({...item, id: Date.now().toString()}))}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {cart.items.length > 0 && (
                <div className="mt-auto pt-4 border-t border-dashed border-[var(--color-border)]">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span>{subtotal.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{isAr ? 'ضريبة القيمة المضافة (١٥٪)' : 'VAT (15%)'}</span>
                    <span>{tax.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-[var(--color-accent)] mt-2">
                    <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                    <span>{total.toFixed(2)} SAR</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[var(--color-card)] flex flex-col gap-3 border-t border-[var(--color-border)] shrink-0">
              <div className="grid grid-cols-3 gap-2">
                <button className="bg-[var(--color-border)] py-2 rounded text-[10px] font-bold border border-transparent hover:border-[var(--color-accent)] transition-colors">{isAr ? 'نقداً' : 'CASH'}</button>
                <button className="bg-[var(--color-border)] py-2 rounded text-[10px] font-bold border border-[var(--color-accent)] text-[var(--color-accent)]">{isAr ? 'بطاقة' : 'CARD'}</button>
                <button className="bg-[var(--color-border)] py-2 rounded text-[10px] font-bold border border-transparent hover:border-[var(--color-accent)] transition-colors">{isAr ? 'ولاء' : 'LOYALTY'}</button>
              </div>
              <div className="flex gap-2 items-center bg-[var(--color-base)] p-3 rounded-lg border border-[var(--color-border)]">
                <div className="w-10 h-10 bg-white p-1 rounded">
                  <div className="w-full h-full bg-[var(--color-base)] flex items-center justify-center text-[8px] font-mono leading-none text-center">QR<br/>ZATCA</div>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold">{isAr ? 'الامتثال للزكاة والدخل' : 'ZATCA COMPLIANCE'}</p>
                  <p className="text-[9px] text-gray-500">UUID: {cart.items.length > 0 ? '8e45-92a1' : '----'}</p>
                </div>
                <div className="text-right">
                  <div className="bg-green-500/20 text-green-500 text-[8px] font-bold px-2 py-0.5 rounded">{isAr ? 'مُحقق' : 'VERIFIED'}</div>
                </div>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={cart.items.length === 0}
                className="w-full bg-[var(--color-accent)] text-black font-black py-4 rounded-xl text-sm shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isAr ? 'إكمال الطلب' : 'COMPLETE ORDER'}
              </button>
            </div>
          </div>
        </main>
  );
}

function NavButton({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <button className={`p-3 rounded-xl transition-all ${active ? 'bg-[var(--color-border)] text-[var(--color-accent)] border border-[var(--color-accent)] shadow-[0_0_15px_rgba(201,168,76,0.1)]' : 'text-gray-500 hover:text-[var(--color-accent)]'}`}>
      {icon}
    </button>
  );
}

function MockProduct({ id, name, nameAr, price, onAdd, isAr }: any) {
  return (
    <div 
      onClick={() => onAdd({ id, name, nameAr, price })}
      className="bg-[var(--color-base)] border border-[var(--color-border)] rounded-xl p-3 flex flex-col gap-2 hover:border-[var(--color-accent)] transition-colors cursor-pointer group"
    >
      <div className="aspect-square bg-[var(--color-surface)] rounded-lg mb-1 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-base)] to-transparent opacity-40"></div>
        <Coffee size={32} className="text-gray-600 z-10" />
        <div className="absolute bottom-2 right-2 bg-[var(--color-accent)] text-black text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
          {price} SAR
        </div>
      </div>
      <p className="font-bold text-sm leading-tight">{isAr ? nameAr : name}</p>
      <p className="text-[10px] text-gray-500 uppercase">{isAr ? 'مشروبات' : 'Beverage'}</p>
    </div>
  );
}

function LockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
