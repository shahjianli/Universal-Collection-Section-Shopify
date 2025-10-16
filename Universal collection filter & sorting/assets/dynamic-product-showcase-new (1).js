class DynamicProduct {
    constructor(){
        this.allProductHandle =  window.allProductHandle;
        this.section = document.querySelector('.dynamic-product-showcase');
        this.sectionId = document.querySelector('.dynamic-product-showcase').dataset.sectionId;
        this.productGrid = document.getElementById(`product-grid-${this.sectionId}`);
        this.btnLoadMore = this.section.querySelector('.js-load-more');
        this.inputCheckbox = this.section.querySelectorAll('input[type="checkbox"]');
        this.inputPrice = this.section.querySelectorAll('.facets__price input');
        this.inputMinPrice = this.section.querySelector('.facets__price input[name="min-price"]');
        this.inputMaxPrice = this.section.querySelector('.facets__price input[name="max-price"]');
        this.inputSorting = this.section.querySelector('select[name="sort_by"]');
        this.activeFilterDiv = this.section.querySelector('.active-facets-desktop');        
        this.limit = this.btnLoadMore.dataset.limit;
        this.btnAddToCarts = this.section.querySelectorAll('.btn-addtocart');
        this.btnAddToCarts.forEach(btn => {
            btn.addEventListener('click',this.addtocart.bind(this));
        });
        this.inputSorting.addEventListener('change', this.productfilter.bind(this));
        this.btnLoadMore.addEventListener('click', this.loadmoreproducts.bind(this));
        this.inputCheckbox.forEach(checkbox => {
            checkbox.addEventListener('change', this.productfilter.bind(this));
        });
        this.inputPrice.forEach((input) => {
            input.addEventListener('input', this.productfilter.bind(this));
        });
        this.tagArr = [], this.availabilityArr = [], this.filterProducts = [];
    }

    addtocart(event){
        event.preventDefault();
        let vid = event.target.dataset.vid;
        let sections = ['cart-drawer', 'cart-icon-bubble'];
        let body = JSON.stringify({id:vid, quantity:1, sections: sections});
        fetch(`${routes.cart_add_url}`, {
            ...fetchConfig(),
            body
        })
        .then((resp) => resp.json())
        .then((response) => {
            const cartbtn = document.querySelector('#cart-icon-bubble');
            const cartDrawer = document.querySelector('cart-drawer');
            
            cartDrawer.classList.remove('is-empty');          
            cartDrawer.renderContents(response);
            setTimeout(() => {   
                cartbtn.dispatchEvent(new Event("click", { bubbles: true })); 
            }, 800);
        });
    }

    loadmoreproducts(event){
        event.preventDefault();
        this.showLoader();
        let button = event.target;
        let products = (button.dataset.activeFilter == 'true') ? this.filterProducts : this.allProductHandle;
        let total_products = parseInt(button.dataset.total);
        let current_show = parseInt(button.dataset.currentShow);
        let cnt = current_show * 2;

        this.sortingProducts(products).then(sortedHandles => {
            let next_products = sortedHandles.slice(current_show, current_show * 2);
            current_show += next_products.length;
            button.dataset.currentShow = current_show;
            this.renderproducts(next_products, 'load-more');
            if (current_show == total_products) this.btnLoadMore.style.display = 'none';
        }) 
        .finally(() => {
            this.hideLoader(); 
        });
    }

    async sortingProducts(handles) {
        let sortingVal = this.inputSorting.value;
        const productData = await Promise.all(
            handles.map(handle => 
                fetch(`${window.Shopify.routes.root}products/${handle}.js`)
                    .then(resp => resp.json())
            )
        );
       
        if (sortingVal === 'manual') {
            productData.sort((a, b) => {
            return this.allProductHandle.indexOf(a.handle) - this.allProductHandle.indexOf(b.handle);
            });
        } else if (sortingVal === 'title-ascending') {
            productData.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortingVal === 'title-descending') {
            productData.sort((a, b) => b.title.localeCompare(a.title));
        } else if (sortingVal === 'price-ascending') {
            productData.sort((a, b) => a.price - b.price);
        } else if (sortingVal === 'price-descending') {
            productData.sort((a, b) => b.price - a.price);
        }

        return productData.map(p => p.handle);
    }

    async renderproducts(next_products,render_type){
        let nextProdArr = [];        
        let products = next_products.map((prodHandle) => {
           return fetch(`${window.Shopify.routes.root}products/${prodHandle}?view=card-product-showcase`)
            .then(resp => resp.text())
            .then((responseText) => {
                const html = new DOMParser().parseFromString(responseText, 'text/html');
                return html.querySelector('.product-card');
            });
        });
        
        
              
        if(products.length > 0){
            const cards = await Promise.all(products);
            const flag = document.createDocumentFragment();
            cards.forEach((card) => {
                if(card && this.productGrid){
                    const clone = card.cloneNode(true);
                    clone.style.opacity = '0';
                    clone.style.transform = 'translateY(20px)';
                    flag.appendChild(clone);
                }
            });
            if(render_type === 'render') this.productGrid.innerHTML = "";
            this.productGrid.appendChild(flag);

            requestAnimationFrame(() => {
                const appended = this.productGrid.querySelectorAll('.product-card');
                appended.forEach(el => {
                    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                });
            });
            (products.length < this.limit && render_type == 'render') ? this.btnLoadMore.style.display = 'none' : this.btnLoadMore.style.display = 'inline-flex';
            if(!document.querySelector('.empty-product-grid').classList.contains('hidden')) document.querySelector('.empty-product-grid').classList.add('hidden');
        }else{
            if(render_type === 'render') this.productGrid.innerHTML = "";
            this.btnLoadMore.style.display = 'none';
            document.querySelector('.empty-product-grid').classList.remove('hidden');
        }
    }

    async productfilter(event){
        event.preventDefault();
        this.showLoader();
        let summaryTag = event.target.closest('details');
        let value;
        let min  = (this.inputMinPrice.value) ? (this.inputMinPrice.value * 100) : this.inputMinPrice.dataset.min;
        let max  = (this.inputMaxPrice.value) ? (this.inputMaxPrice.value * 100) : this.inputMaxPrice.dataset.max;  
        let sortingVal = this.inputSorting.value;      
        let finalFilterProducts = [];     
        
        if(event.target.closest('.chk-tag') || event.target.closest('.remove-facets[data-filter="tag"]')){
            value = (event.target.closest('.chk-tag')) ? event.target.value : event.target.closest('.remove-facets').dataset.value; 
            if(event.target.checked){
                this.tagArr.push(value);
            }else{
                const index = this.tagArr.indexOf(value);
                if(index > -1) this.tagArr.splice(index,1);
                this.section.querySelector(`.facet-checkbox input[value="${value}"]`).checked = false;
            }            
        }
        
        if(event.target.closest('.chk-availability') || event.target.closest('.remove-facets[data-filter="availability"]')){
            let availability_val;
            value = (event.target.closest('.chk-availability')) ? event.target.value : event.target.closest('.remove-facets').dataset.value;
            availability_val = (value == 'true') ? true : false;
            if(event.target.checked){
                this.availabilityArr.push(availability_val);
            }else{
                const index = this.availabilityArr.indexOf(availability_val);
                if(index > -1) this.availabilityArr.splice(index,1);
                this.section.querySelector(`.facet-checkbox input[value="${value}"]`).checked = false;
            }            
        }
        
        if(event.target.matches('.facets__price .field__input')){ 
            if(event.target.name == "min-price") min = (event.target.value) * 100;
            if(event.target.name == "max-price") max = (event.target.value) * 100;
        }
                           
        this.activeFilters(this.tagArr, this.availabilityArr, min, max);

        let productData = await Promise.all(
            this.allProductHandle.map(handle => 
                fetch(`${window.Shopify.routes.root}products/${handle}.js`).then(resp => resp.json())  
            )
        );

        if (sortingVal === 'manual') {
            productData.sort((a, b) => {
                return this.allProductHandle.indexOf(a.handle) - this.allProductHandle.indexOf(b.handle);
            });
        } else if (sortingVal === 'title-ascending') {
            productData.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortingVal === 'title-descending') {
            productData.sort((a, b) => b.title.localeCompare(a.title));
        } else if (sortingVal === 'price-ascending') {
            productData.sort((a, b) => a.price - b.price);
        } else if (sortingVal === 'price-descending') {
            productData.sort((a, b) => b.price - a.price);
        }

        this.filterProducts = productData.filter(product => {
            const priceOk = product.price >= min && product.price <= max;
            const tagOk = this.tagArr.length === 0 || this.tagArr.every(tag => product.tags.includes(tag));
            const availabilityOk = this.availabilityArr.length === 0 || this.availabilityArr.some(availability => product.available == availability);
            
            return priceOk && tagOk && availabilityOk;
        }).map(product => product.handle);
        
        if(this.filterProducts.length > this.limit){
            finalFilterProducts = this.filterProducts.slice(0,this.limit);
            this.btnLoadMore.dataset.activeFilter = true;
            this.btnLoadMore.dataset.currentShow = finalFilterProducts.length;
            this.btnLoadMore.dataset.total = this.filterProducts.length;
        }else{
            finalFilterProducts = this.filterProducts;
        }
        this.sortingProducts(finalFilterProducts).then(sortedHandles => {
            this.renderproducts(sortedHandles,'render');
        })
        .finally(() => {
            this.hideLoader(); 
        });

        return false;
    }

    activeFilters(tagArr, availabilityArr, minPrice, maxPrice){
        let removefilterHTML = '';
        if(tagArr.length > 0){
            tagArr.forEach(tag => {
                removefilterHTML += `<facet-remove><a class="active-facets__button active-facets__button--light remove-facets" data-value="${tag}" data-filter="tag">
                    <span class="active-facets__button-inner button button--tertiary">
                        Tag: ${tag}
                        <span class="svg-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-close-small" viewBox="0 0 12 13"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8.486 9.33 2.828 3.67M2.885 9.385l5.544-5.77"></path></svg></span>
                    </span>
                </a></facet-remove>`;
            });
        }

        if(availabilityArr.length > 0){
            availabilityArr.forEach(availability => {
                let availabilityText = (availability == true) ? 'In stock' : 'Out of stock';
                removefilterHTML += `<facet-remove><a class="active-facets__button active-facets__button--light remove-facets" data-value="${availability}" data-filter="availability">
                    <span class="active-facets__button-inner button button--tertiary">
                        Availability: ${availabilityText}
                        <span class="svg-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-close-small" viewBox="0 0 12 13"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8.486 9.33 2.828 3.67M2.885 9.385l5.544-5.77"></path></svg></span>
                    </span>
                </a></facet-remove>`;
            });
        }

        if(this.inputMinPrice.value != '' || this.inputMaxPrice.value !=  ''){
            let min_price = (this.inputMinPrice.value != '') ? minPrice : 0;
            let max_price = (this.inputMaxPrice.value != '') ? maxPrice : this.inputMaxPrice.dataset.max;
            let value = (this.inputMinPrice.value != '') ? 'min:'+this.inputMinPrice.value : 'max:'+this.inputMaxPrice.value;
            removefilterHTML += `<facet-remove><a class="active-facets__button active-facets__button--light remove-facets" data-value="${value}" data-filter="price">
                <span class="active-facets__button-inner button button--tertiary">
                    Price: ${Shopify.formatMoney(min_price, window.shopify_money)}-${Shopify.formatMoney(max_price, window.shopify_money)}
                    <span class="svg-wrapper"><svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-close-small" viewBox="0 0 12 13"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8.486 9.33 2.828 3.67M2.885 9.385l5.544-5.77"></path></svg></span>
                </span>
            </a></facet-remove>`; 
        }

        removefilterHTML += `<facet-remove class="active-facets__button-wrapper"><a href="javascript:void(0);" class="active-facets__button-remove underlined-link remove-facets remove-all-filter" data-value="all" data-filter="all">
                    <span>Remove All</span>
                </a></facet-remove>`;
        this.activeFilterDiv.innerHTML = removefilterHTML;
        let removeFacets = this.section.querySelectorAll('facet-remove');
        removeFacets.forEach(btn => { 
            btn.addEventListener('click', this.removefilter.bind(this));
        });
    }

    removefilter(event){
        if(event.target.closest('.remove-facets')){
            event.preventDefault();
            const value = event.target.closest('.remove-facets').dataset.value;
            const filter = event.target.closest('.remove-facets').dataset.filter;
            
            if (filter == 'all') { 
                this.showLoader();
                this.tagArr = [];
                this.availabilityArr = [];
                this.inputMinPrice.value = '';
                this.inputMaxPrice.value = '';

                // Uncheck all checkboxes
                this.inputCheckbox.forEach(chk => chk.checked = false);
            }
            else if (filter == 'price') {
                this.inputMinPrice.value = '';
                this.inputMaxPrice.value = '';
            }
            this.productfilter(event);
        }
    }

    showLoader() {
        const loader = this.section.querySelector('.product-loader');
        loader?.classList.remove('hidden');
    }

    hideLoader() {
        const loader = this.section.querySelector('.product-loader');
        loader?.classList.add('hidden');
    }
}   

new DynamicProduct();