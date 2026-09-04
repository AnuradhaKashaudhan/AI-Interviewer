import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Check, ArrowRight, Loader2, Sparkles, AlertCircle, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getAuthToken } from '../services/authApi.js';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const UpgradePage = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan') || 'pro';
  const navigate = useNavigate();
  const { user, fetchEntitlements } = useAuth();


  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/plans');
        const data = await response.json();
        const found = (data.plans || []).find((p) => p.id.toLowerCase() === planId.toLowerCase());
        if (found) {
          setPlan(found);
        } else {
          // Fallback if network fails
          setPlan({
            id: planId,
            name: planId === 'advanced' ? 'AI Engineer Advanced Preparation' : 'Technical Interview Pack',
            price_inr: planId === 'advanced' ? 99 : 19,
            amount_paise: planId === 'advanced' ? 9900 : 1900,
            currency: 'INR',
            description: 'Adaptive follow-ups, detailed feedback, and AI Career Intelligence insights.',
            features: [
              'Unlimited mock interview sessions',
              'Adaptive follow-up questions',
              'Detailed AI feedback breakdown',
              'Advanced ATS Fix-It analysis',
              'Saved history & exports',
            ],
          });
        }
      } catch (err) {
        console.error('Failed to fetch plan config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanDetails();
  }, [planId]);

  const handlePayment = async () => {
    setProcessingPayment(true);
    setError('');

    try {
      const token = getAuthToken() || localStorage.getItem('access_token');
      // 1. Create Razorpay Order on Backend
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan_id: plan.id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.detail || orderData.message || 'Failed to create payment order.');
      }

      // 2. Load Razorpay SDK
      const sdkLoaded = await loadRazorpayScript();
      
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be loaded. Please check your network connection.');
      }

      // 3. Launch Razorpay Checkout Modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'AI Interviewer Platform',
        description: `${orderData.plan.name} Subscription`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            // 4. Verify Payment Signature Server-Side
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.detail || 'Payment signature verification failed.');
            }

            if (fetchEntitlements) {
              fetchEntitlements(token);
            }

            navigate('/payment/success', {

              state: {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                planName: orderData.plan.name,
                amount: orderData.plan.price_inr,
              },
            });
          } catch (vErr) {
            console.error('Verification error:', vErr);
            navigate('/payment/failed', { state: { reason: vErr.message } });
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            setError('Payment process was cancelled by user.');
          },
        },
        prefill: {
          name: user?.fullName || 'Candidate',
          email: user?.email || '',
        },
        theme: {
          color: '#16324f',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setProcessingPayment(false);
        const failReason = resp.error?.description || 'Payment was declined or failed.';
        navigate('/payment/failed', { state: { reason: failReason } });
      });
      rzp.open();
    } catch (err) {
      console.error('Payment checkout error:', err);
      setError(err.message || 'Unable to process payment request.');
      setProcessingPayment(false);
    }
  };


  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#16324f]" />
        <span className="ml-3 text-sm font-medium text-slate-600">Resolving plan configuration...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-[28px] border border-stone-200 bg-white p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8a5d2f]">
          <Sparkles className="h-3.5 w-3.5" />
          Checkout & Plan Upgrade
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-slate-900">
          Upgrade to {plan?.name || 'Pro'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Review your selected plan order summary and authorize secure payment via Razorpay.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        {/* Left Column: Plan Benefits & Candidate Info */}
        <div className="space-y-6">
          <div className="rounded-[28px] border border-stone-200 bg-white p-6">
            <h3 className="font-display text-xl font-semibold text-slate-900">Plan Included Features</h3>
            <p className="mt-1 text-xs text-slate-500">{plan?.description}</p>

            <div className="mt-6 space-y-3">
              {(plan?.features || []).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-[#f8f4ec] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Account Details</div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{user?.fullName || 'Candidate'}</div>
                <div className="text-xs text-slate-500">{user?.email || 'Authenticated User'}</div>
              </div>
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Verified Candidate
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Payment CTA */}
        <div className="rounded-[28px] border border-[#16324f] bg-white p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Order Summary</div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>

            <div className="my-6 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Selected Plan:</span>
                <span className="font-semibold text-slate-900">{plan?.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Base Price:</span>
                <span className="font-semibold text-slate-900">₹{plan?.price_inr}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes & Fees:</span>
                <span className="font-semibold text-slate-900">₹0</span>
              </div>

              <div className="border-t border-stone-200 pt-3 flex justify-between text-base font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-[#16324f]">₹{plan?.price_inr} INR</span>
              </div>
            </div>

            <div className="rounded-2xl bg-stone-50 p-4 text-xs text-slate-500 space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <Lock className="h-3.5 w-3.5 text-[#16324f]" />
                Razorpay Secure Payment Encryption
              </div>
              <p>HMAC SHA256 server-side signature verification enabled. Prices resolved strictly on server.</p>
            </div>
          </div>

          <button
            type="button"
            disabled={processingPayment}
            onClick={handlePayment}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#16324f] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#0f2438] disabled:opacity-60"
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Continue to Payment (₹{plan?.price_inr})</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
