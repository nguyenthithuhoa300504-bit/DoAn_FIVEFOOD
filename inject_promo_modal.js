const fs = require('fs');
const path = 'c:\\Users\\Admin\\Desktop\\DoAn\\frontend\\src\\App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Inject state
if (!content.includes('const [showPromoModal')) {
    content = content.replace(
        "const [promoError, setPromoError] = useState('');",
        "const [promoError, setPromoError] = useState('');\n  const [showPromoModal, setShowPromoModal] = useState(false);"
    );
}

// 2. Replace voucher section
const triggerJSX = `                  {/* Voucher Section */}
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <div 
                      className="fivefood-voucher-trigger"
                      onClick={() => setShowPromoModal(true)}
                    >
                      <div className="voucher-trigger-left">
                        <span className="voucher-icon">🎟️</span>
                        <div className="voucher-text">
                          <span className="voucher-title">Giảm giá từ FIVEFOOD</span>
                          {appliedPromo ? (
                            <span className="voucher-applied-text">Đã chọn: {appliedPromo}</span>
                          ) : (
                            <span className="voucher-desc">Chọn hoặc nhập mã</span>
                          )}
                        </div>
                      </div>
                      <span className="voucher-arrow">&gt;</span>
                    </div>
                  </div>`;

const startIdx = content.indexOf('{/* Voucher Section */}');
const endIdx = content.indexOf('{/* Payment Methods */}');

if (startIdx !== -1 && endIdx !== -1 && !content.includes('fivefood-voucher-trigger')) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    content = before + triggerJSX + '\n\n                  ' + after;
}

// 3. Inject Modal at the bottom
const modalJSX = `
      {/* FIVEFOOD VOUCHER MODAL */}
      {showPromoModal && (
        <div className="fivefood-voucher-overlay" onClick={() => setShowPromoModal(false)}>
          <div className="fivefood-voucher-modal" onClick={e => e.stopPropagation()}>
            <div className="fivefood-voucher-header">
              <h2>Giảm giá từ FIVEFOOD</h2>
              <button className="fivefood-voucher-close" onClick={() => setShowPromoModal(false)}>✕</button>
            </div>
            
            <div className="fivefood-voucher-body">
              <div className="fivefood-voucher-list">
                {activePromotions.map(promo => {
                  const potentialDiscount = Math.min((totalPrice * promo.DiscountPercentage) / 100, promo.MaxDiscountAmount);
                  const isExpensive = totalPrice >= 150000;
                  const isEligible = totalPrice >= promo.MinOrderValue;
                  const isSelected = promoCodeInput === promo.PromoCode;

                  return (
                    <div key={promo.PromotionID} className={\`fivefood-voucher-card \${!isEligible ? 'disabled' : ''} \${isSelected ? 'selected' : ''}\`}>
                      <div className="fivefood-voucher-left">
                        <span className="fivefood-ticket-icon">🎟️</span>
                        <span className="fivefood-ticket-label">FIVEFOOD</span>
                      </div>
                      <div className="fivefood-voucher-right">
                        <div className="fivefood-voucher-info">
                          <div className="fivefood-voucher-tags">
                            <span className="tag-limit">Quy đổi giới hạn</span>
                            <span className="tag-source">Từ FIVEFOOD</span>
                          </div>
                          <h3 className="fivefood-voucher-title">
                            {isExpensive 
                              ? \`Giảm ngay \${potentialDiscount.toLocaleString('vi-VN')}đ\` 
                              : \`Giảm \${promo.DiscountPercentage}%\`}
                          </h3>
                          <p className="fivefood-voucher-subtitle">
                            Cho đơn trên \${promo.MinOrderValue.toLocaleString('vi-VN')}đ{promo.MaxDiscountAmount < 1000000 ? \`, giảm tối đa \${promo.MaxDiscountAmount.toLocaleString('vi-VN')}đ\` : ''}
                          </p>
                          <p className="fivefood-voucher-note">
                            Dành cho cửa hàng và khách hàng thân thiết.
                          </p>
                          {!isEligible && (
                            <p className="fivefood-voucher-warning">
                              <span style={{color: '#f97316', marginRight: 4, fontWeight: 'bold'}}>!</span> 
                              Mua thêm \${(promo.MinOrderValue - totalPrice).toLocaleString('vi-VN')}đ để dùng voucher...
                            </p>
                          )}
                          <div className="fivefood-voucher-footer">
                            <div className="fivefood-progress-bar">
                              <div className="fivefood-progress-fill" style={{width: '77%'}}></div>
                            </div>
                            <div className="fivefood-footer-text">
                              <span>Đã dùng 77%, Có hiệu lực ngay</span>
                              <a href="#">Điều khoản & điều kiện</a>
                            </div>
                          </div>
                        </div>
                        <div className="fivefood-voucher-action">
                          <span className="live-tag">Chỉ trên WEB</span>
                          <button 
                            className={\`fivefood-btn-apply \${isSelected ? 'applied' : ''}\`}
                            disabled={!isEligible}
                            onClick={() => {
                              if (isEligible) {
                                setPromoCodeInput(promo.PromoCode);
                                handleApplyPromo(promo.PromoCode);
                                setShowPromoModal(false);
                              }
                            }}
                          >
                            {isSelected ? 'Đang dùng' : 'Nhận'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="fivefood-voucher-options">
                <label className="fivefood-no-voucher">
                  <span>Không dùng phiếu giảm giá</span>
                  <input 
                    type="radio" 
                    name="promoModalOption" 
                    checked={!promoCodeInput} 
                    onChange={() => {
                      setPromoCodeInput('');
                      handleApplyPromo('');
                      setShowPromoModal(false);
                    }}
                  />
                </label>
              </div>

              <div className="fivefood-voucher-input-section">
                <h4>Thêm mã khuyến mãi</h4>
                <div className="fivefood-input-group">
                  <input 
                    type="text" 
                    placeholder="Nhập mã" 
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  />
                  <button onClick={() => {
                    handleApplyPromo(promoCodeInput);
                    setShowPromoModal(false);
                  }}>Áp dụng</button>
                </div>
              </div>
              
              <div className="fivefood-voucher-submit">
                <button onClick={() => setShowPromoModal(false)}>Xác nhận</button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes('fivefood-voucher-overlay')) {
    content = content.replace('{!isAdminRoute && <Chatbot />}', modalJSX + '\n      {!isAdminRoute && <Chatbot />}');
}

fs.writeFileSync(path, content);
console.log('Successfully injected Promo Modal to App.jsx');
