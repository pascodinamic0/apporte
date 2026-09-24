-- Apporte seed data — idempotent
-- Users (demo)
insert into public.users (id, email, name, role, merchant_id, rider_id)
values
  ('u_customer','customer@demo.apporte.cd','Client Démo','customer',null,null),
  ('u_merchant','merchant@demo.apporte.cd','Restaurant Démo','merchant','rest_kfc_gombe',null),
  ('u_rider','rider@demo.apporte.cd','Livreur Démo','rider',null,'rider_1'),
  ('u_admin','admin@demo.apporte.cd','Admin Démo','admin',null,null)
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    merchant_id = excluded.merchant_id,
    rider_id = excluded.rider_id,
    updated_at = now();

-- Restaurants
insert into public.restaurants (id,name,description,cuisine,eta_minutes,rating,image_url,zone,latitude,longitude,is_open)
values
  ('rest_kfc_gombe','KFC Gombe',null,'Fast Food',20,4.4,'/images/restaurants/kfc.jpg','Gombe',-4.3156,15.3126,true),
  ('rest_pili_pili','Pili Pili Grill',null,'Grillades',25,4.5,'/images/restaurants/pilipili.jpg','Gombe',-4.322,15.3075,true),
  ('rest_chez_flore','Chez Flore',null,'Congolais',28,4.3,'/images/restaurants/chezflore.jpg','Gombe',-4.314,15.297,true),
  ('rest_bistrot','Le Bistrot de Gombe',null,'Bistrot',22,4.2,'/images/restaurants/bistrot.jpg','Gombe',-4.309,15.302,true),
  ('rest_maison_poulet','Maison du Poulet',null,'Poulet',24,4.1,'/images/restaurants/poulet.jpg','Gombe',-4.318,15.315,true),
  ('rest_pizza_inn','Pizza Inn Gombe',null,'Pizza',26,4.0,'/images/restaurants/pizzainn.jpg','Gombe',-4.311,15.309,true),
  ('rest_fuego','Chez Fuego Grill',null,'Grillades',23,4.2,'/images/restaurants/fuego.jpg','Gombe',-4.3195,15.299,true),
  ('rest_orient','L''Orient Express',null,'Asiatique',27,4.1,'/images/restaurants/orient.jpg','Gombe',-4.305,15.31,true),
  ('rest_mamba','Chez Mamba',null,'Congolais',25,4.0,'/images/restaurants/mamba.jpg','Gombe',-4.312,15.316,true),
  ('rest_baguette','Baguette & Boteka',null,'Boulangerie',18,4.3,'/images/restaurants/baguette.jpg','Gombe',-4.317,15.308,true),
  ('rest_sushi','Sushi Kin Gombe',null,'Sushi',30,4.2,'/images/restaurants/sushi.jpg','Gombe',-4.313,15.319,true),
  ('rest_regal','Le Régal Congo',null,'Congolais',26,4.1,'/images/restaurants/regal.jpg','Gombe',-4.312,15.316,true)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    cuisine = excluded.cuisine,
    eta_minutes = excluded.eta_minutes,
    rating = excluded.rating,
    image_url = excluded.image_url,
    zone = excluded.zone,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    is_open = excluded.is_open,
    updated_at = now();

-- Menu Items
insert into public.menu_items (id,restaurant_id,name,description,price_usd,available,image_url,cuisine_tag)
values
  ('mi_kfc_1','rest_kfc_gombe','Bucket Poulet (3 pcs)','Poulet croustillant KFC',8,true,'/images/menu/kfc_bucket.jpg','Poulet'),
  ('mi_kfc_2','rest_kfc_gombe','Burger Zinger','Burger poulet épicé',6.5,true,'/images/menu/kfc_burger.jpg','Fast Food'),
  ('mi_pili_1','rest_pili_pili','Brochettes de Bœuf','Brochettes tendres au pili pili',7,true,'/images/menu/brochettes.jpg','Grillades'),
  ('mi_pili_2','rest_pili_pili','Poisson Braisé','Poisson braisé à la congolaise',10,true,'/images/menu/poisson_braise.jpg','Poisson'),
  ('mi_pizza_1','rest_pizza_inn','Pizza Margherita (M)','Classique, mozzarella et basilic',9,true,'/images/menu/pizza.jpg','Pizza'),
  ('mi_pizza_2','rest_pizza_inn','Pizza Poulet (M)','Poulet, oignons, poivrons',11,true,'/images/menu/pizza_poulet.jpg','Pizza'),
  ('mi_poulet_1','rest_maison_poulet','Poulet Grillé','Demi poulet grillé',12,true,'/images/menu/poulet_grille.jpg','Poulet'),
  ('mi_flore_1','rest_chez_flore','Saka-Saka','Feuilles de manioc, arachides',5,true,'/images/menu/sakasaka.jpg','Congolais'),
  ('mi_bistrot_1','rest_bistrot','Steak Frites','Steak, frites et salade',13,true,'/images/menu/steak.jpg','Bistrot')
on conflict (id) do update
set restaurant_id = excluded.restaurant_id,
    name = excluded.name,
    description = excluded.description,
    price_usd = excluded.price_usd,
    available = excluded.available,
    image_url = excluded.image_url,
    cuisine_tag = excluded.cuisine_tag,
    updated_at = now();

-- Smart Find Products
insert into public.smart_find_products (id,name,description,price_usd,stock,category,image_url,tags)
values
  ('sf_powerbank','Power bank 20,000 mAh','Recharge ton téléphone partout',18,20,'Mobile & Tech','/images/smart-finds/powerbank.jpg',array['charge rapide','USB-C']),
  ('sf_compressor','Compresseur portable voiture','Gonfle tes pneus en minutes',25,10,'Automotive','/images/smart-finds/compressor.jpg',array['12V','LED']),
  ('sf_lamp','Lampe rechargeable','Éclairage d''urgence',12,30,'Home','/images/smart-finds/lamp.jpg',null),
  ('sf_fast_charger','Chargeur rapide 20W','Charge express USB-C',9,40,'Mobile & Tech','/images/smart-finds/charger.jpg',null),
  ('sf_phone_holder','Support téléphone voiture','Stable, compatible universel',7,25,'Automotive','/images/smart-finds/holder.jpg',null),
  ('sf_fan','Ventilateur portable','USB, compact et puissant',14,15,'Lifestyle','/images/smart-finds/fan.jpg',null),
  ('sf_jump_starter','Batterie de démarrage','Démarre ta voiture rapidement',58,8,'Automotive','/images/smart-finds/jumpstarter.jpg',null),
  ('sf_emergency_light','Lampe d''urgence LED','Signalisation de nuit',10,20,'Automotive','/images/smart-finds/emergency.jpg',null)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    price_usd = excluded.price_usd,
    stock = excluded.stock,
    category = excluded.category,
    image_url = excluded.image_url,
    tags = excluded.tags,
    updated_at = now();

-- Riders
insert into public.riders (id,name,status,reliability_percent,latitude,longitude,earnings_today_usd)
values
  ('rider_1','Jean','online',98,-4.314,15.312,0),
  ('rider_2','Patrick','online',96,-4.318,15.305,0),
  ('rider_3','Martha','online',92,-4.321,15.309,0),
  ('rider_4','Junior','online',90,-4.312,15.298,0),
  ('rider_5','Amina','offline',95,-4.305,15.315,0),
  ('rider_6','Michel','online',91,-4.316,15.301,0)
on conflict (id) do update
set name = excluded.name,
    status = excluded.status,
    reliability_percent = excluded.reliability_percent,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    earnings_today_usd = excluded.earnings_today_usd,
    updated_at = now();

