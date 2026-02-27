<%- include('partials/header') %>

<section style="
    background: linear-gradient(135deg, rgba(155, 28, 49, 0.95) 0%, rgba(26, 26, 46, 0.98) 100%);
    color: white;
    padding: 5rem 1.5rem 4rem;
    text-align: center;
    position: relative;
    overflow: hidden;
">
    <div style="position: relative; z-index: 1; max-width: 800px; margin: 0 auto;">
        <div style="
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.15);
            padding: 0.5rem 1.25rem;
            border-radius: 9999px;
            margin-bottom: 2rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        ">
            <span style="font-size: 1.25rem;">🇪🇹</span>
            <span style="font-weight: 600; font-size: 0.95rem;">EthioMatch</span>
        </div>
        
        <h1 style="
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 1.5rem;
        ">
            Find Your <span style="
                background: linear-gradient(135deg, #FCD34D, #F59E0B);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            ">Meaningful Connection</span>
        </h1>
        
        <p style="
            font-size: clamp(1.1rem, 2.5vw, 1.35rem);
            color: rgba(255, 255, 255, 0.92);
            margin-bottom: 2.5rem;
            line-height: 1.7;
            max-width: 650px;
            margin-left: auto;
            margin-right: auto;
        ">
            <%= typeof tagline !== 'undefined' ? tagline : 'Connect with like-minded Ethiopians seeking serious, long-term relationships built on trust and shared values.' %>
        </p>
        
        <div style="
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 3.5rem;
        ">
            <a href="/register" style="
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                background: linear-gradient(135deg, #D4AF37, #B89628);
                color: #1A1A2E;
                text-decoration: none;
                border-radius: 0.75rem;
                font-weight: 700;
                font-size: 1.05rem;
                transition: all 0.2s ease-in-out;
                box-shadow: 0 4px 14px rgba(212, 175, 55, 0.4);
            " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(212, 175, 55, 0.6)'" 
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 14px rgba(212, 175, 55, 0.4)'">
                ✨ Join Free Today
            </a>
            <a href="/login" style="
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 2rem;
                background: rgba(255, 255, 255, 0.15);
                color: white;
                text-decoration: none;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 0.75rem;
                font-weight: 600;
                font-size: 1.05rem;
                transition: all 0.2s ease-in-out;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.25)';this.style.borderColor='rgba(255, 255, 255, 0.5)'" 
               onmouseout="this.style.background='rgba(255, 255, 255, 0.15)';this.style.borderColor='rgba(255, 255, 255, 0.3)'">
                🔑 Already a Member?
            </a>
        </div>
        
        <div style="
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
            padding-top: 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
        ">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: rgba(255, 255, 255, 0.9); font-size: 0.95rem;">
                <span>✅</span><span>100% Free to Join</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: rgba(255, 255, 255, 0.9); font-size: 0.95rem;">
                <span>🔒</span><span>Verified Profiles</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: rgba(255, 255, 255, 0.9); font-size: 0.95rem;">
                <span>❤️</span><span>Serious Relationships</span>
            </div>
        </div>
    </div>
</section>

<section style="padding: 5rem 1.5rem; background: #FFFFFF; text-align: center;">
    <div style="max-width: 1280px; margin: 0 auto;">
        <h2 style="font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; color: #1A1A2E; margin-bottom: 1rem;">How EthioMatch Works</h2>
        <p style="color: #6B7280; font-size: 1.1rem; max-width: 600px; margin: 0 auto 3.5rem; line-height: 1.7;">
            A simple, respectful process designed for meaningful connections
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 2rem; margin-top: 2rem;">
            <div style="background: #FFF9F5; padding: 2rem 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #E5E7EB;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #9B1C31, #C43A4B); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: white; font-size: 1.5rem; font-weight: 700;">1</div>
                <h3 style="font-size: 1.25rem; font-weight: 600; color: #1A1A2E; margin-bottom: 0.75rem;">Create Your Profile</h3>
                <p style="color: #6B7280; line-height: 1.6;">Share your story, values, and what you're looking for in a partner.</p>
            </div>
            
            <div style="background: #FFF9F5; padding: 2rem 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #E5E7EB;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #D4AF37, #B89628); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: #1A1A2E; font-size: 1.5rem; font-weight: 700;">2</div>
                <h3 style="font-size: 1.25rem; font-weight: 600; color: #1A1A2E; margin-bottom: 0.75rem;">Discover Matches</h3>
                <p style="color: #6B7280; line-height: 1.6;">Browse compatible profiles based on your preferences and values.</p>
            </div>
            
            <div style="background: #FFF9F5; padding: 2rem 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #E5E7EB;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #2D6A4F, #40916C); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: white; font-size: 1.5rem; font-weight: 700;">3</div>
                <h3 style="font-size: 1.25rem; font-weight: 600; color: #1A1A2E; margin-bottom: 0.75rem;">Connect & Chat</h3>
                <p style="color: #6B7280; line-height: 1.6;">When you both express interest, start a conversation in a safe space.</p>
            </div>
            
            <div style="background: #FFF9F5; padding: 2rem 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #E5E7EB;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366F1, #8B5CF6); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: white; font-size: 1.5rem; font-weight: 700;">4</div>
                <h3 style="font-size: 1.25rem; font-weight: 600; color: #1A1A2E; margin-bottom: 0.75rem;">Build Something Real</h3>
                <p style="color: #6B7280; line-height: 1.6;">Take your connection offline and build a meaningful relationship.</p>
            </div>
        </div>
    </div>
</section>

<section style="padding: 5rem 1.5rem; background: linear-gradient(180deg, #FFF9F5 0%, #FEFCE8 100%);">
    <div style="max-width: 1280px; margin: 0 auto; text-align: center;">
        <h2 style="font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; color: #1A1A2E; margin-bottom: 1rem;">Why Choose EthioMatch?</h2>
        <p style="color: #6B7280; font-size: 1.1rem; max-width: 600px; margin: 0 auto 3.5rem; line-height: 1.7;">
            Designed specifically for Ethiopians seeking serious relationships
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
            <div style="background: white; padding: 1.75rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: left; border-left: 4px solid #9B1C31;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <span style="font-size: 1.5rem;">🎯</span>
                    <h4 style="font-weight: 600; color: #1A1A2E;">Culturally Aligned</h4>
                </div>
                <p style="color: #6B7280; line-height: 1.6;">Connect with people who share your cultural values, traditions, and life goals.</p>
            </div>
            
            <div style="background: white; padding: 1.75rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: left; border-left: 4px solid #D4AF37;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <span style="font-size: 1.5rem;">🛡️</span>
                    <h4 style="font-weight: 600; color: #1A1A2E;">Safety First</h4>
                </div>
                <p style="color: #6B7280; line-height: 1.6;">Profile verification, reporting tools, and community guidelines keep you safe.</p>
            </div>
            
            <div style="background: white; padding: 1.75rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: left; border-left: 4px solid #2D6A4F;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <span style="font-size: 1.5rem;">💬</span>
                    <h4 style="font-weight: 600; color: #1A1A2E;">Meaningful Conversations</h4>
                </div>
                <p style="color: #6B7280; line-height: 1.6;">Quality over quantity. Our matching focuses on compatibility, not just swipes.</p>
            </div>
            
            <div style="background: white; padding: 1.75rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: left; border-left: 4px solid #6366F1;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <span style="font-size: 1.5rem;">🌍</span>
                    <h4 style="font-weight: 600; color: #1A1A2E;">Global Ethiopian Community</h4>
                </div>
                <p style="color: #6B7280; line-height: 1.6;">Connect with Ethiopians worldwide, whether you're in Addis or the diaspora.</p>
            </div>
        </div>
    </div>
</section>

<section style="padding: 5rem 1.5rem; background: linear-gradient(135deg, #9B1C31 0%, #7A1626 100%); color: white; text-align: center;">
    <div style="max-width: 700px; margin: 0 auto;">
        <h2 style="font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; margin-bottom: 1.25rem; line-height: 1.2;">Ready to Find Your Person?</h2>
        <p style="font-size: 1.15rem; color: rgba(255, 255, 255, 0.95); margin-bottom: 2.5rem; line-height: 1.7;">
            Join thousands of Ethiopians who are building serious, lasting relationships.
        </p>
        
        <a href="/register" style="
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1.125rem 2.5rem;
            background: white;
            color: #9B1C31;
            text-decoration: none;
            border-radius: 0.75rem;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.2s ease-in-out;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        " onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.35)'" 
           onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 20px rgba(0, 0, 0, 0.25)'">
            ✨ Create Your Free Account
        </a>
        
        <p style="margin-top: 2rem; color: rgba(255, 255, 255, 0.8); font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="color: #FCD34D; font-weight: 600;">⚠️</span>
            <span>Must be 18+ to join. By signing up, you agree to our Terms of Service.</span>
        </p>
    </div>
</section>

<%- include('partials/footer') %>
