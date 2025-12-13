fn main(birth_year: u16, current_year: u16, min_age: u16) {
    let age = current_year - birth_year;
    assert(age >= min_age);
}
